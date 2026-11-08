<?php

namespace Tests\Feature\Checkout;

use App\Models\User;
use App\Services\OrderPricingService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesCommerceData;
use Tests\Support\FakeStripeClient;
use Tests\TestCase;

class OrderStoreTest extends TestCase
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

    private function registerIntent(User $user, int $product, int $quantity, string $currency = 'huf', array $overrides = []): array
    {
        $service = app(OrderPricingService::class);
        $calculation = $service->calculate(
            [['product_id' => $product, 'quantity' => $quantity]],
            $currency
        );

        $intent = FakeStripeClient::paymentIntent(array_merge([
            'id' => 'pi_store_1',
            'amount' => $service->toStripeAmountFromMinor($calculation['total_minor'], $currency),
            'currency' => $currency,
            'metadata' => [
                'user_id' => (string) $user->id,
                'cart_hash' => hash('sha256', json_encode($calculation['items'])),
            ],
        ], $overrides));

        $this->stripe->respond('get', '#^/v1/payment_intents/pi_store_1$#', $intent);

        $this->stripe->respond('post', '#^/v1/payment_intents/pi_store_1$#', fn (array $params) => array_merge($intent, [
            'metadata' => array_merge(
                (array) $intent['metadata'],
                $params['metadata'] ?? []
            ),
        ]));

        return $intent;
    }

    private function storePayload(int $product, int $quantity, array $overrides = []): array
    {
        return array_merge([
            'shipping_details' => json_encode([
                'first_name' => 'Test',
                'city' => 'Budapest',
            ]),
            'payment_method' => 'credit_card_stripe',
            'payment_intent_id' => 'pi_store_1',
            'items' => [
                [
                    'product_id' => $product,
                    'quantity' => $quantity,
                ],
            ],
            'locale' => 'hu',
            'currency' => 'HUF',
        ], $overrides);
    }

    public function test_an_order_is_created_and_stock_is_reserved(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $user = User::factory()->create();

        $this->registerIntent($user, $product, 2);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 2))
            ->assertCreated();

        $orderId = $response->json('order_id');

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'user_id' => $user->id,
            'order_total' => 472320,
            'currency' => 'huf',
            'status' => 'pending_payment',
            'payment_intent_id' => 'pi_store_1',
            'stock_status' => 'reserved',
        ]);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'product_id' => $product,
            'quantity' => 2,
            'price' => 236160,
        ]);

        $this->assertSame(3, $this->productStock($product));

        $update = $this->stripe->requestsTo(
            'post',
            '#^/v1/payment_intents/pi_store_1$#'
        )[0];

        $this->assertSame(
            (string) $orderId,
            $update['params']['metadata']['order_id']
        );
    }

    public function test_orders_in_eur_use_the_eur_price_list(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $this->registerIntent($user, $product, 3, 'eur');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 3, [
                'currency' => 'EUR',
                'locale' => 'en',
            ]))
            ->assertCreated();

        $this->assertDatabaseHas('orders', [
            'order_total' => 1836,
            'currency' => 'eur',
        ]);
    }

    public function test_an_amount_mismatch_is_rejected(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $this->registerIntent($user, $product, 2, 'huf', [
            'amount' => 100,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 2))
            ->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
        $this->assertSame(5, $this->productStock($product));
    }

    public function test_an_intent_of_another_user_is_rejected(): void
    {
        $product = $this->createProduct();
        $owner = User::factory()->create();
        $thief = User::factory()->create();

        $this->registerIntent($owner, $product, 1);

        $this->actingAs($thief, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 1))
            ->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_a_changed_cart_is_rejected(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $this->registerIntent($user, $product, 2);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 1))
            ->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_an_intent_that_already_has_an_order_is_rejected(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $service = app(OrderPricingService::class);
        $calculation = $service->calculate(
            [['product_id' => $product, 'quantity' => 1]],
            'huf'
        );

        $this->registerIntent($user, $product, 1, 'huf', [
            'metadata' => [
                'user_id' => (string) $user->id,
                'cart_hash' => hash('sha256', json_encode($calculation['items'])),
                'order_id' => '99',
            ],
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 1))
            ->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_payment_intent_id_must_be_unique_across_orders(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $this->createOrder($user, $product, 1, 'huf', [
            'payment_intent_id' => 'pi_unique_test',
        ]);

        try {
            $this->createOrder($user, $product, 1, 'huf', [
                'payment_intent_id' => 'pi_unique_test',
            ]);

            $this->fail('A duplicate PaymentIntent ID should not be accepted.');
        } catch (QueryException $exception) {
            $this->assertStringContainsString(
                'payment_intent_id',
                strtolower($exception->getMessage())
            );
        }

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_multiple_orders_can_have_a_null_payment_intent_id(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $this->createOrder($user, $product, 1, 'huf', [
            'payment_intent_id' => null,
        ]);

        $this->createOrder($user, $product, 1, 'huf', [
            'payment_intent_id' => null,
        ]);

        $this->assertDatabaseCount('orders', 2);

        $this->assertDatabaseHas('orders', [
            'payment_intent_id' => null,
        ]);
    }

    public function test_a_stripe_update_failure_rolls_the_order_back(): void
    {
        $product = $this->createProduct(['stock' => 5]);
        $user = User::factory()->create();

        $this->registerIntent($user, $product, 2);

        $this->stripe->respond(
            'post',
            '#^/v1/payment_intents/pi_store_1$#',
            [
                'error' => [
                    'type' => 'api_error',
                    'message' => 'down',
                ],
            ],
            500
        );

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 2))
            ->assertStatus(500);

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
        $this->assertSame(5, $this->productStock($product));
    }

    public function test_guests_and_invalid_input_are_rejected(): void
    {
        $product = $this->createProduct();

        $this->postJson('/api/orders', $this->storePayload($product, 1))
            ->assertUnauthorized();

        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [])
            ->assertStatus(422);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 1, [
                'shipping_details' => 'not-json',
            ]))
            ->assertStatus(422);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->storePayload($product, 1, [
                'currency' => 'GBP',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('currency');
    }

    public function test_finalize_reports_a_pending_webhook_for_a_paid_intent(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $order = $this->createOrder($user, $product, 1, 'huf', [
            'payment_intent_id' => 'pi_final_1',
        ]);

        $this->stripe->respond(
            'get',
            '#^/v1/payment_intents/pi_final_1$#',
            FakeStripeClient::paymentIntent([
                'id' => 'pi_final_1',
                'status' => 'succeeded',
                'amount' => 23616000,
                'amount_received' => 23616000,
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'order_id' => (string) $order->id,
                ],
            ])
        );

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders/finalize', [
                'payment_intent_id' => 'pi_final_1',
            ])
            ->assertStatus(202)
            ->assertJsonPath('webhook_pending', true)
            ->assertJsonPath('order_id', $order->id);

        DB::table('orders')->where('id', $order->id)->update([
            'status' => 'processing',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders/finalize', [
                'payment_intent_id' => 'pi_final_1',
            ])
            ->assertOk()
            ->assertJsonPath('webhook_pending', false);
    }

    public function test_finalize_rejects_unpaid_or_mismatching_intents(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();

        $order = $this->createOrder($user, $product, 1, 'huf', [
            'payment_intent_id' => 'pi_final_2',
        ]);

        $this->stripe->respond(
            'get',
            '#^/v1/payment_intents/pi_final_2$#',
            FakeStripeClient::paymentIntent([
                'id' => 'pi_final_2',
                'status' => 'requires_payment_method',
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'order_id' => (string) $order->id,
                ],
            ])
        );

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders/finalize', [
                'payment_intent_id' => 'pi_final_2',
            ])
            ->assertStatus(409);

        $this->stripe->respond(
            'get',
            '#^/v1/payment_intents/pi_final_2$#',
            FakeStripeClient::paymentIntent([
                'id' => 'pi_final_2',
                'status' => 'succeeded',
                'amount' => 100,
                'amount_received' => 100,
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'order_id' => (string) $order->id,
                ],
            ])
        );

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders/finalize', [
                'payment_intent_id' => 'pi_final_2',
            ])
            ->assertStatus(409);
    }

    public function test_finalize_does_not_expose_other_users_orders(): void
    {
        $product = $this->createProduct();
        $owner = User::factory()->create();

        $this->createOrder($owner, $product, 1, 'huf', [
            'payment_intent_id' => 'pi_final_3',
        ]);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/orders/finalize', [
                'payment_intent_id' => 'pi_final_3',
            ])
            ->assertNotFound();
    }

    public function test_order_history_lists_only_own_orders(): void
    {
        $product = $this->createProduct();
        $user = User::factory()->create();
        $other = User::factory()->create();

        $mine = $this->createOrder($user, $product, 2);
        $this->createOrder($other, $product, 1);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $mine->id)
            ->assertJsonPath('0.currency', 'huf')
            ->assertJsonPath('0.items.0.price_at_purchase', 236160);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/orders/' . $mine->id)
            ->assertOk()
            ->assertJsonPath('order_total', 472320);

        $this->actingAs($other, 'sanctum')
            ->getJson('/api/orders/' . $mine->id)
            ->assertForbidden();
    }
}