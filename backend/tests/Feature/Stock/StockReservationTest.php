<?php

namespace Tests\Feature\Stock;

use App\Models\User;
use App\Services\StockReservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\CreatesCommerceData;
use Tests\Support\FakeStripeClient;
use Tests\TestCase;

class StockReservationTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    private StockReservationService $stock;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
        $this->stock = app(StockReservationService::class);
    }

    protected function tearDown(): void
    {
        FakeStripeClient::uninstall();

        parent::tearDown();
    }

    public function test_reserve_decrements_stock_and_sets_an_expiry(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->createOrder(User::factory()->create(), $product, 2);

        $this->stock->reserve($order);

        $this->assertSame(3, $this->productStock($product));
        $this->assertSame('reserved', $order->fresh()->stock_status);
        $this->assertTrue($order->fresh()->stock_reserved_until->isFuture());
    }

    public function test_reserving_again_extends_the_reservation_without_decrementing_twice(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->createOrder(User::factory()->create(), $product, 2);

        $this->stock->reserve($order);
        DB::table('orders')->where('id', $order->id)->update(['stock_reserved_until' => now()->addMinute()]);

        $this->stock->reserve($order->fresh());

        $this->assertSame(3, $this->productStock($product));
        $this->assertTrue($order->fresh()->stock_reserved_until->greaterThan(now()->addMinutes(20)));
    }

    public function test_reserve_fails_without_enough_stock_and_changes_nothing(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->createOrder(User::factory()->create(), $product, 2);
        DB::table('products')->where('id', $product)->update(['stock' => 1]);

        try {
            $this->stock->reserve($order);
            $this->fail('Reservation succeeded without enough stock.');
        } catch (ValidationException $exception) {
            $this->assertSame(1, $this->productStock($product));
            $this->assertSame('none', $order->fresh()->stock_status);
        }
    }

    public function test_release_returns_reserved_stock_once(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->createOrder(User::factory()->create(), $product, 2);

        $this->stock->reserve($order);
        $this->stock->release($order->fresh());
        $this->stock->release($order->fresh());

        $this->assertSame(5, $this->productStock($product));
        $this->assertSame('released', $order->fresh()->stock_status);
        $this->assertNull($order->fresh()->stock_reserved_until);
    }

    public function test_commit_keeps_the_stock_deducted(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->createOrder(User::factory()->create(), $product, 2);

        $this->stock->reserve($order);
        $this->stock->commit($order->fresh());
        $this->stock->release($order->fresh());

        $this->assertSame(3, $this->productStock($product));
        $this->assertSame('committed', $order->fresh()->stock_status);
    }

    public function test_restock_returns_committed_stock_exactly_once(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->createOrder(User::factory()->create(), $product, 2);

        $this->stock->reserve($order);
        $this->stock->commit($order->fresh());
        $this->stock->restock($order->fresh());
        $this->stock->restock($order->fresh());

        $this->assertSame(5, $this->productStock($product));
        $this->assertSame('restocked', $order->fresh()->stock_status);
    }

    public function test_reserve_ignores_orders_that_are_already_committed_or_restocked(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $order = $this->createOrder(User::factory()->create(), $product, 2);

        $this->stock->reserve($order);
        $this->stock->commit($order->fresh());
        $this->stock->reserve($order->fresh());

        $this->assertSame(3, $this->productStock($product));
        $this->assertSame('committed', $order->fresh()->stock_status);
    }

    public function test_expired_reservations_are_released_and_their_intents_canceled(): void
    {
        $stripe = FakeStripeClient::install();
        config(['services.stripe.secret' => 'sk_test_fake']);
        $stripe->respond('get', '#^/v1/payment_intents/pi_expired$#', FakeStripeClient::paymentIntent(['id' => 'pi_expired']));
        $stripe->respond('post', '#^/v1/payment_intents/pi_expired/cancel$#', FakeStripeClient::paymentIntent(['id' => 'pi_expired', 'status' => 'canceled']));

        $product = $this->createProduct(['stock' => 5]);
        $user = User::factory()->create();
        $expired = $this->createOrder($user, $product, 2, 'huf', ['payment_intent_id' => 'pi_expired']);
        $this->stock->reserve($expired);
        DB::table('orders')->where('id', $expired->id)->update(['stock_reserved_until' => now()->subMinute()]);

        $active = $this->createOrder($user, $product, 1);
        $this->stock->reserve($active);

        $this->artisan('orders:release-expired-stock')->assertExitCode(0);

        $this->assertSame('failed', $expired->fresh()->status);
        $this->assertSame('released', $expired->fresh()->stock_status);
        $this->assertSame('reserved', $active->fresh()->stock_status);
        $this->assertSame(4, $this->productStock($product));
        $this->assertCount(1, $stripe->requestsTo('post', '#/cancel$#'));
    }

    public function test_paid_intents_are_never_released_by_the_expiry_command(): void
    {
        $stripe = FakeStripeClient::install();
        config(['services.stripe.secret' => 'sk_test_fake']);
        $stripe->respond('get', '#^/v1/payment_intents/pi_paid$#', FakeStripeClient::paymentIntent(['id' => 'pi_paid', 'status' => 'succeeded']));

        $product = $this->createProduct(['stock' => 5]);
        $order = $this->createOrder(User::factory()->create(), $product, 2, 'huf', ['payment_intent_id' => 'pi_paid']);
        $this->stock->reserve($order);
        DB::table('orders')->where('id', $order->id)->update(['stock_reserved_until' => now()->subMinute()]);

        $this->artisan('orders:release-expired-stock')->assertExitCode(0);

        $this->assertSame('reserved', $order->fresh()->stock_status);
        $this->assertSame('pending_payment', $order->fresh()->status);
        $this->assertSame(3, $this->productStock($product));
    }
}