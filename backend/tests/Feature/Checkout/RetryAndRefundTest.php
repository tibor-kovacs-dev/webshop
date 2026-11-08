<?php

namespace Tests\Feature\Checkout;

use App\Models\User;
use App\Services\StockReservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesCommerceData;
use Tests\Support\FakeStripeClient;
use Tests\TestCase;

class RetryAndRefundTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    private FakeStripeClient $stripe;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
        config(['services.stripe.secret' => 'sk_test_fake']);

        $this->stripe = FakeStripeClient::install();
    }

    protected function tearDown(): void
    {
        FakeStripeClient::uninstall();

        parent::tearDown();
    }

    private function failedOrder(User $user, int $product, int $quantity = 2): \App\Models\Order
    {
        $order = $this->createOrder($user, $product, $quantity, 'huf', [
            'status' => 'failed',
            'payment_intent_id' => 'pi_old',
        ]);

        DB::table('orders')->where('id', $order->id)->update([
            'stock_status' => 'released',
        ]);

        return $order->fresh();
    }

    private function fakeRetryIntents(string $oldStatus = 'requires_payment_method'): void
    {
        $this->stripe->respond('get', '#^/v1/payment_intents/pi_old$#', FakeStripeClient::paymentIntent([
            'id' => 'pi_old',
            'status' => $oldStatus,
        ]));

        $this->stripe->respond('post', '#^/v1/payment_intents$#', fn (array $params) => FakeStripeClient::paymentIntent([
            'id' => 'pi_new',
            'client_secret' => 'pi_new_secret_xyz',
            'amount' => $params['amount'],
            'currency' => $params['currency'],
            'metadata' => $params['metadata'],
        ]));

        $this->stripe->respond('post', '#^/v1/payment_intents/pi_old/cancel$#', FakeStripeClient::paymentIntent([
            'id' => 'pi_old',
            'status' => 'canceled',
        ]));
    }

    public function test_a_failed_order_reuses_its_active_intent_and_reserves_stock_again(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $user = User::factory()->create();
        $order = $this->failedOrder($user, $product);

        $this->fakeRetryIntents();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->id}/retry")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('reused', true)
            ->assertJsonPath('payment_intent_id', 'pi_old')
            ->assertJsonPath('payment_attempt', 1);

        $order = $order->fresh();

        $this->assertSame('pending_payment', $order->status);
        $this->assertSame('pi_old', $order->payment_intent_id);
        $this->assertSame(1, $order->payment_attempts);
        $this->assertSame('reserved', $order->stock_status);
        $this->assertSame(3, $this->productStock($product));

        $this->assertCount(
            0,
            $this->stripe->requestsTo('post', '#^/v1/payment_intents$#')
        );

        $this->assertCount(
            0,
            $this->stripe->requestsTo('post', '#^/v1/payment_intents/pi_old/cancel$#')
        );
    }

    public function test_a_canceled_intent_is_replaced_with_a_new_intent(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $user = User::factory()->create();
        $order = $this->failedOrder($user, $product);

        $this->fakeRetryIntents('canceled');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->id}/retry")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('reused', false)
            ->assertJsonPath('payment_intent_id', 'pi_new')
            ->assertJsonPath('client_secret', 'pi_new_secret_xyz')
            ->assertJsonPath('payment_attempt', 1);

        $order = $order->fresh();

        $this->assertSame('pending_payment', $order->status);
        $this->assertSame('pi_new', $order->payment_intent_id);
        $this->assertSame(1, $order->payment_attempts);
        $this->assertSame('reserved', $order->stock_status);

        $this->assertCount(
            1,
            $this->stripe->requestsTo('post', '#^/v1/payment_intents$#')
        );

        $this->assertCount(
            0,
            $this->stripe->requestsTo('post', '#^/v1/payment_intents/pi_old/cancel$#')
        );

        $create = $this->stripe->requestsTo('post', '#^/v1/payment_intents$#')[0];

        $this->assertSame(47232000, (int) $create['params']['amount']);

        $this->assertTrue(
            $this->stripe->hasIdempotencyKey(
                $create,
                "order-{$order->id}-payment-attempt-1"
            )
        );
    }

    public function test_retry_fails_when_the_stock_is_gone(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $user = User::factory()->create();
        $order = $this->failedOrder($user, $product);

        DB::table('products')->where('id', $product)->update([
            'stock' => 1,
        ]);

        $this->fakeRetryIntents();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->id}/retry")
            ->assertStatus(409);

        $this->assertSame('failed', $order->fresh()->status);
        $this->assertSame(1, $this->productStock($product));

        $this->assertCount(
            0,
            $this->stripe->requestsTo('post', '#^/v1/payment_intents$#')
        );
    }

    public function test_an_active_intent_is_reused_for_a_pending_order(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $user = User::factory()->create();

        $order = $this->createOrder($user, $product, 1, 'huf', [
            'payment_intent_id' => 'pi_old',
        ]);

        app(StockReservationService::class)->reserve($order);

        $this->fakeRetryIntents();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->id}/retry")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('reused', true)
            ->assertJsonPath('payment_intent_id', 'pi_old')
            ->assertJsonPath('payment_attempt', 0);

        $this->assertCount(
            0,
            $this->stripe->requestsTo('post', '#^/v1/payment_intents$#')
        );

        $this->assertSame(4, $this->productStock($product));
        $this->assertSame('pending_payment', $order->fresh()->status);
    }

    public function test_a_paid_or_processing_intent_blocks_the_retry(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $user = User::factory()->create();
        $order = $this->failedOrder($user, $product);

        foreach (['succeeded', 'processing'] as $status) {
            $this->fakeRetryIntents($status);

            $this->actingAs($user, 'sanctum')
                ->postJson("/api/orders/{$order->id}/retry")
                ->assertStatus(409);
        }

        $this->assertCount(
            0,
            $this->stripe->requestsTo('post', '#^/v1/payment_intents$#')
        );
    }

    public function test_only_failed_or_pending_orders_of_the_owner_can_be_retried(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $paid = $this->createOrder($user, $product, 1, 'huf', [
            'status' => 'processing',
        ]);

        $failed = $this->failedOrder($user, $product, 1);

        $this->fakeRetryIntents();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$paid->id}/retry")
            ->assertStatus(400);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson("/api/orders/{$failed->id}/retry")
            ->assertForbidden();
    }

    public function test_guests_cannot_retry_or_refund(): void
    {
        $product = $this->createProduct();

        $order = $this->createOrder(
            User::factory()->create(),
            $product
        );

        $this->postJson("/api/orders/{$order->id}/retry")
            ->assertUnauthorized();

        $this->postJson("/api/order/{$order->id}/refund")
            ->assertUnauthorized();
    }

    public function test_a_refund_marks_the_order_pending_and_calls_stripe_once(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $order = $this->createOrder($user, $product, 1, 'huf', [
            'status' => 'processing',
            'payment_intent_id' => 'pi_paid',
        ]);

        $this->stripe->respond('post', '#^/v1/refunds$#', [
            'id' => 're_1',
            'object' => 'refund',
            'status' => 'succeeded',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/order/{$order->id}/refund")
            ->assertStatus(202)
            ->assertJsonPath('refund_id', 're_1');

        $this->assertSame('refund_pending', $order->fresh()->status);

        $request = $this->stripe->requestsTo('post', '#^/v1/refunds$#')[0];

        $this->assertSame('pi_paid', $request['params']['payment_intent']);

        $this->assertTrue(
            $this->stripe->hasIdempotencyKey(
                $request,
                "order-{$order->id}-full-refund"
            )
        );
    }

    public function test_a_failed_refund_restores_the_previous_status(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $order = $this->createOrder($user, $product, 1, 'huf', [
            'status' => 'completed',
            'payment_intent_id' => 'pi_paid',
        ]);

        $this->stripe->respond(
            'post',
            '#^/v1/refunds$#',
            [
                'error' => [
                    'type' => 'api_error',
                    'message' => 'down',
                ],
            ],
            500
        );

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/order/{$order->id}/refund")
            ->assertStatus(502);

        $this->assertSame('completed', $order->fresh()->status);
    }

    public function test_refund_rules(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $this->stripe->respond('post', '#^/v1/refunds$#', [
            'id' => 're_1',
            'object' => 'refund',
        ]);

        $failed = $this->createOrder($user, $product, 1, 'huf', [
            'status' => 'failed',
        ]);

        $refunded = $this->createOrder($user, $product, 1, 'huf', [
            'status' => 'refunded',
        ]);

        $paid = $this->createOrder($user, $product, 1, 'huf', [
            'status' => 'processing',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/order/{$failed->id}/refund")
            ->assertStatus(400);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/order/{$refunded->id}/refund")
            ->assertOk()
            ->assertJsonPath('already_refunded', true);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson("/api/order/{$paid->id}/refund")
            ->assertNotFound();

        $this->assertCount(
            0,
            $this->stripe->requestsTo('post', '#^/v1/refunds$#')
        );
    }
}
