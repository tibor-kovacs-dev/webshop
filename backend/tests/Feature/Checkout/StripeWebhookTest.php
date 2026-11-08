<?php

namespace Tests\Feature\Checkout;

use App\Jobs\SendOrderConfirmationEmail;
use App\Jobs\SendOrderInvoiceEmail;
use App\Jobs\SendPaymentFailureNotification;
use App\Models\Order;
use App\Models\User;
use App\Services\StockReservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\CreatesCommerceData;
use Tests\Support\FakeStripeClient;
use Tests\TestCase;

class StripeWebhookTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    private FakeStripeClient $stripe;

    private StockReservationService $stock;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
        Queue::fake();
        config(['services.stripe.secret' => 'sk_test_fake', 'services.stripe.webhook_secret' => 'whsec_test']);

        $this->stripe = FakeStripeClient::install();
        $this->stock = app(StockReservationService::class);
    }

    protected function tearDown(): void
    {
        FakeStripeClient::uninstall();

        parent::tearDown();
    }

    private function deliver(string $type, array $object, ?string $eventId = null, ?string $signature = null): TestResponse
    {
        $payload = json_encode([
            'id' => $eventId ?? 'evt_' . uniqid(),
            'object' => 'event',
            'type' => $type,
            'data' => ['object' => $object],
        ]);

        $timestamp = time();
        $signature ??= "t=$timestamp,v1=" . hash_hmac('sha256', $timestamp . '.' . $payload, 'whsec_test');

        return $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $payload);
    }

    private function succeeded(Order $order, array $overrides = []): array
    {
        return array_merge([
            'id' => $order->payment_intent_id,
            'object' => 'payment_intent',
            'amount_received' => $order->totalMinor(),
            'currency' => $order->currency,
            'metadata' => ['user_id' => (string) $order->user_id, 'order_id' => (string) $order->id],
        ], $overrides);
    }

    private function reservedOrder(int $product, int $quantity = 1): Order
    {
        $order = $this->createOrder(User::factory()->create(), $product, $quantity);
        $this->stock->reserve($order);

        return $order->fresh();
    }

    private function eventStatus(string $eventId): ?string
    {
        return DB::table('stripe_webhook_events')->where('stripe_event_id', $eventId)->value('status');
    }

    public function test_requests_with_a_bad_signature_are_rejected(): void
    {
        $order = $this->reservedOrder($this->createProduct());

        $this->deliver('payment_intent.succeeded', $this->succeeded($order), null, 't=1,v1=bad')->assertStatus(400);
        $this->call('POST', '/api/stripe/webhook', [], [], [], ['CONTENT_TYPE' => 'application/json'], '{}')->assertStatus(400);

        $this->assertSame('pending_payment', $order->fresh()->status);
        $this->assertDatabaseCount('stripe_webhook_events', 0);
    }

    public function test_a_successful_payment_moves_the_order_to_processing(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->reservedOrder($product, 2);

        $this->deliver('payment_intent.succeeded', $this->succeeded($order), 'evt_ok')->assertOk();

        $order = $order->fresh();

        $this->assertSame('processing', $order->status);
        $this->assertSame('committed', $order->stock_status);
        $this->assertSame(3, $this->productStock($product));
        $this->assertSame('processed', $this->eventStatus('evt_ok'));
        Queue::assertPushed(SendOrderConfirmationEmail::class);
        Queue::assertPushed(SendOrderInvoiceEmail::class);
    }

    public function test_a_duplicate_delivery_is_ignored(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->reservedOrder($product);

        $this->deliver('payment_intent.succeeded', $this->succeeded($order), 'evt_dup')->assertOk();
        $this->deliver('payment_intent.succeeded', $this->succeeded($order), 'evt_dup')
            ->assertOk()
            ->assertJsonPath('duplicate', true);

        Queue::assertPushed(SendOrderConfirmationEmail::class, 1);
        $this->assertSame(4, $this->productStock($product));
    }

    public function test_a_payment_that_does_not_match_the_order_is_ignored(): void
    {
        $order = $this->reservedOrder($this->createProduct());

        $this->deliver('payment_intent.succeeded', $this->succeeded($order, ['amount_received' => 100]))->assertOk();
        $this->deliver('payment_intent.succeeded', $this->succeeded($order, ['currency' => 'eur']))->assertOk();
        $this->deliver('payment_intent.succeeded', $this->succeeded($order, ['metadata' => ['user_id' => '999', 'order_id' => (string) $order->id]]))->assertOk();
        $this->deliver('payment_intent.succeeded', $this->succeeded($order, ['metadata' => ['user_id' => (string) $order->user_id, 'order_id' => '999']]))->assertOk();

        $this->assertSame('pending_payment', $order->fresh()->status);
        Queue::assertNothingPushed();
    }

    public function test_an_unknown_payment_intent_is_acknowledged(): void
    {
        $this->deliver('payment_intent.succeeded', [
            'id' => 'pi_unknown',
            'amount_received' => 1000,
            'currency' => 'huf',
            'metadata' => ['user_id' => '1'],
        ], 'evt_unknown')->assertOk();

        $this->assertSame('processed', $this->eventStatus('evt_unknown'));
    }

    public function test_unhandled_event_types_are_acknowledged(): void
    {
        $this->deliver('customer.created', ['id' => 'cus_1'], 'evt_other')->assertOk();

        $this->assertSame('processed', $this->eventStatus('evt_other'));
    }

    public function test_a_failed_payment_releases_the_stock(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->reservedOrder($product, 2);

        $this->deliver('payment_intent.payment_failed', ['id' => $order->payment_intent_id])->assertOk();

        $order = $order->fresh();

        $this->assertSame('failed', $order->status);
        $this->assertSame('released', $order->stock_status);
        $this->assertSame(5, $this->productStock($product));
        Queue::assertPushed(SendPaymentFailureNotification::class);
    }

    public function test_a_failure_event_does_not_touch_an_order_that_is_already_paid(): void
    {
        $order = $this->reservedOrder($this->createProduct());
        $this->deliver('payment_intent.succeeded', $this->succeeded($order))->assertOk();

        $this->deliver('payment_intent.payment_failed', ['id' => $order->payment_intent_id])->assertOk();

        $this->assertSame('processing', $order->fresh()->status);
        $this->assertSame('committed', $order->fresh()->stock_status);
    }

    public function test_a_late_successful_payment_recovers_a_failed_order(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->reservedOrder($product, 2);

        $this->deliver('payment_intent.payment_failed', ['id' => $order->payment_intent_id])->assertOk();
        $this->deliver('payment_intent.succeeded', $this->succeeded($order->fresh()))->assertOk();

        $order = $order->fresh();

        $this->assertSame('processing', $order->status);
        $this->assertSame('committed', $order->stock_status);
        $this->assertSame(3, $this->productStock($product));
        $this->assertCount(0, $this->stripe->requestsTo('post', '#^/v1/refunds$#'));
    }

    public function test_a_late_payment_without_stock_is_refunded_automatically(): void
    {
        $this->stripe->respond('post', '#^/v1/refunds$#', ['id' => 're_auto', 'object' => 'refund', 'status' => 'succeeded']);
        $product = $this->createProduct(['stock' => 1]);
        $order = $this->reservedOrder($product, 1);

        $this->deliver('payment_intent.payment_failed', ['id' => $order->payment_intent_id])->assertOk();
        DB::table('products')->where('id', $product)->update(['stock' => 0]);

        $this->deliver('payment_intent.succeeded', $this->succeeded($order->fresh()), 'evt_late')->assertOk();

        $order = $order->fresh();

        $this->assertSame('refund_pending', $order->status);
        $this->assertSame('released', $order->stock_status);
        $this->assertSame(0, $this->productStock($product));
        $this->assertSame('processed', $this->eventStatus('evt_late'));

        $request = $this->stripe->requestsTo('post', '#^/v1/refunds$#')[0];
        $this->assertSame($order->payment_intent_id, $request['params']['payment_intent']);
        $this->assertTrue($this->stripe->hasIdempotencyKey($request, "order-{$order->id}-auto-refund"));
        Queue::assertNotPushed(SendOrderConfirmationEmail::class);
        Queue::assertNotPushed(SendOrderInvoiceEmail::class);
    }

    public function test_a_failed_automatic_refund_reopens_the_event_for_a_retry(): void
    {
        $this->stripe->respond('post', '#^/v1/refunds$#', ['error' => ['type' => 'api_error', 'message' => 'down']], 500);
        $product = $this->createProduct(['stock' => 1]);
        $order = $this->reservedOrder($product, 1);

        $this->deliver('payment_intent.payment_failed', ['id' => $order->payment_intent_id])->assertOk();
        DB::table('products')->where('id', $product)->update(['stock' => 0]);

        $this->deliver('payment_intent.succeeded', $this->succeeded($order->fresh()), 'evt_retry')->assertStatus(500);

        $this->assertSame('refund_pending', $order->fresh()->status);
        $this->assertSame('failed', $this->eventStatus('evt_retry'));

        $this->stripe->respond('post', '#^/v1/refunds$#', ['id' => 're_auto', 'object' => 'refund', 'status' => 'succeeded']);

        $this->deliver('payment_intent.succeeded', $this->succeeded($order->fresh()), 'evt_retry')->assertOk();

        $this->assertSame('processed', $this->eventStatus('evt_retry'));
        $this->assertSame(2, (int) DB::table('stripe_webhook_events')->where('stripe_event_id', 'evt_retry')->value('attempts'));
        $this->assertCount(2, $this->stripe->requestsTo('post', '#^/v1/refunds$#'));
    }

    public function test_a_late_payment_fulfils_the_order_when_stock_returns_before_the_retry(): void
    {
        $this->stripe->respond('post', '#^/v1/refunds$#', ['error' => ['type' => 'api_error', 'message' => 'down']], 500);
        $product = $this->createProduct(['stock' => 1]);
        $order = $this->reservedOrder($product, 1);

        $this->deliver('payment_intent.payment_failed', ['id' => $order->payment_intent_id])->assertOk();
        DB::table('products')->where('id', $product)->update(['stock' => 0]);
        $this->deliver('payment_intent.succeeded', $this->succeeded($order->fresh()), 'evt_restock')->assertStatus(500);

        DB::table('products')->where('id', $product)->update(['stock' => 3]);
        $this->deliver('payment_intent.succeeded', $this->succeeded($order->fresh()), 'evt_restock')->assertOk();

        $this->assertSame('processing', $order->fresh()->status);
        $this->assertSame('committed', $order->fresh()->stock_status);
        $this->assertSame(2, $this->productStock($product));
    }

    public function test_a_full_refund_restocks_the_order(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->reservedOrder($product, 2);
        $this->deliver('payment_intent.succeeded', $this->succeeded($order))->assertOk();
        $this->assertSame(3, $this->productStock($product));

        $this->deliver('charge.refunded', [
            'id' => 'ch_1',
            'payment_intent' => $order->payment_intent_id,
            'refunded' => true,
        ])->assertOk();

        $order = $order->fresh();

        $this->assertSame('refunded', $order->status);
        $this->assertSame('restocked', $order->stock_status);
        $this->assertSame(5, $this->productStock($product));
    }

    public function test_a_partial_refund_changes_nothing(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->reservedOrder($product, 2);
        $this->deliver('payment_intent.succeeded', $this->succeeded($order))->assertOk();

        $this->deliver('charge.refunded', [
            'id' => 'ch_2',
            'payment_intent' => $order->payment_intent_id,
            'refunded' => false,
        ])->assertOk();

        $this->assertSame('processing', $order->fresh()->status);
        $this->assertSame(3, $this->productStock($product));
    }

    public function test_the_refund_of_an_automatically_refunded_order_does_not_restock(): void
    {
        $this->stripe->respond('post', '#^/v1/refunds$#', ['id' => 're_auto', 'object' => 'refund', 'status' => 'succeeded']);
        $product = $this->createProduct(['stock' => 1]);
        $order = $this->reservedOrder($product, 1);

        $this->deliver('payment_intent.payment_failed', ['id' => $order->payment_intent_id])->assertOk();
        DB::table('products')->where('id', $product)->update(['stock' => 0]);
        $this->deliver('payment_intent.succeeded', $this->succeeded($order->fresh()))->assertOk();

        $this->deliver('charge.refunded', [
            'id' => 'ch_3',
            'payment_intent' => $order->payment_intent_id,
            'refunded' => true,
        ])->assertOk();

        $this->assertSame('refunded', $order->fresh()->status);
        $this->assertSame(0, $this->productStock($product));
    }
}