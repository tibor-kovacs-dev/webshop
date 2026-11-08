<?php

namespace Tests\Feature\Checkout;

use App\Models\User;
use App\Services\OrderPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesCommerceData;
use Tests\Support\FakeStripeClient;
use Tests\TestCase;

class CreateIntentTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    private FakeStripeClient $stripe;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
        config(['services.stripe.secret' => 'sk_test_fake']);

        $this->stripe = FakeStripeClient::install();
        $this->stripe->respond('post', '#^/v1/payment_intents$#', fn (array $params) => FakeStripeClient::paymentIntent([
            'amount' => $params['amount'],
            'currency' => $params['currency'],
            'metadata' => $params['metadata'],
        ]));
    }

    protected function tearDown(): void
    {
        FakeStripeClient::uninstall();

        parent::tearDown();
    }

    private function intentRequest(User $user, array $payload)
    {
        return $this->actingAs($user, 'sanctum')->postJson('/api/checkout/create-intent', $payload);
    }

    public function test_the_intent_is_created_for_the_server_side_total_in_huf(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $this->intentRequest($user, [
            'currency' => 'HUF',
            'items' => [['id' => $product, 'quantity' => 3]],
        ])
            ->assertOk()
            ->assertJsonPath('amount', 70848000)
            ->assertJsonPath('total', 708480)
            ->assertJsonPath('currency', 'huf')
            ->assertJsonPath('client_secret', 'pi_test_1_secret_abc');

        $request = $this->stripe->requestsTo('post', '#^/v1/payment_intents$#')[0];
        $calculation = app(OrderPricingService::class)->calculate([['product_id' => $product, 'quantity' => 3]], 'huf');

        $this->assertSame(70848000, (int) $request['params']['amount']);
        $this->assertSame('huf', $request['params']['currency']);
        $this->assertSame((string) $user->id, $request['params']['metadata']['user_id']);
        $this->assertSame(hash('sha256', json_encode($calculation['items'])), $request['params']['metadata']['cart_hash']);
        $this->assertArrayNotHasKey('fx_quote', $request['params']);
    }

    public function test_the_intent_is_created_directly_in_eur(): void
    {
        $product = $this->createProduct();

        $this->intentRequest(User::factory()->create(), [
            'currency' => 'eur',
            'items' => [['id' => $product, 'quantity' => 3]],
        ])
            ->assertOk()
            ->assertJsonPath('amount', 183600)
            ->assertJsonPath('total', 1836)
            ->assertJsonPath('currency', 'eur');
    }

    public function test_client_supplied_prices_are_ignored(): void
    {
        $product = $this->createProduct();

        $this->intentRequest(User::factory()->create(), [
            'currency' => 'huf',
            'items' => [['id' => $product, 'quantity' => 1, 'price' => 1]],
            'total' => 1,
        ])
            ->assertOk()
            ->assertJsonPath('amount', 23616000);
    }

    public function test_guests_cannot_create_intents(): void
    {
        $product = $this->createProduct();

        $this->postJson('/api/checkout/create-intent', [
            'currency' => 'huf',
            'items' => [['id' => $product, 'quantity' => 1]],
        ])->assertUnauthorized();

        $this->assertCount(0, $this->stripe->requests);
    }

    public function test_input_is_validated(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $this->intentRequest($user, ['currency' => 'gbp', 'items' => [['id' => $product, 'quantity' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors('currency');

        $this->intentRequest($user, ['currency' => 'huf', 'items' => []])
            ->assertStatus(422)->assertJsonValidationErrors('items');

        $this->intentRequest($user, ['currency' => 'huf', 'items' => [['id' => $product, 'quantity' => 0]]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.quantity');

        $this->intentRequest($user, ['currency' => 'huf', 'items' => [
            ['id' => $product, 'quantity' => 1],
            ['id' => $product, 'quantity' => 1],
        ]])->assertStatus(422);

        $this->assertCount(0, $this->stripe->requests);
    }

    public function test_insufficient_stock_is_rejected(): void
    {
        $product = $this->createProduct(['stock' => 1]);

        $this->intentRequest(User::factory()->create(), [
            'currency' => 'huf',
            'items' => [['id' => $product, 'quantity' => 2]],
        ])->assertStatus(422)->assertJsonValidationErrors('items');

        $this->assertCount(0, $this->stripe->requests);
    }

    public function test_amounts_below_the_stripe_minimum_are_rejected(): void
    {
        $product = $this->createProduct(['price' => 0, 'discount' => 0]);

        $this->intentRequest(User::factory()->create(), [
            'currency' => 'huf',
            'items' => [['id' => $product, 'quantity' => 1]],
        ])->assertStatus(422);

        $this->assertCount(0, $this->stripe->requests);
    }

    public function test_a_stripe_failure_returns_a_gateway_error(): void
    {
        $this->stripe->respond('post', '#^/v1/payment_intents$#', ['error' => ['type' => 'api_error', 'message' => 'down']], 500);
        $product = $this->createProduct();

        $this->intentRequest(User::factory()->create(), [
            'currency' => 'huf',
            'items' => [['id' => $product, 'quantity' => 1]],
        ])->assertStatus(502);
    }
}