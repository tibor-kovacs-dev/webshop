<?php

namespace Tests\Feature\Catalog;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesCommerceData;
use Tests\TestCase;

class ProductAdminTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'category' => 'phones',
            'name' => 'New phone',
            'slug' => 'new-phone',
            'description' => 'A phone with a long enough description.',
            'image' => '/images/new-phone-large.jpg',
            'price' => 500,
            'discount' => 20,
            'stock' => 7,
        ], $overrides);
    }

    public function test_guests_cannot_manage_products(): void
    {
        $id = $this->createProduct();

        $this->postJson('/api/products', $this->payload())->assertUnauthorized();
        $this->patchJson("/api/products/$id", ['price' => 1])->assertUnauthorized();
        $this->deleteJson("/api/products/$id")->assertUnauthorized();
    }

    public function test_regular_users_cannot_manage_products(): void
    {
        $id = $this->createProduct();
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/products', $this->payload())->assertForbidden();
        $this->actingAs($user, 'sanctum')->patchJson("/api/products/$id", ['price' => 1])->assertForbidden();
        $this->actingAs($user, 'sanctum')->deleteJson("/api/products/$id")->assertForbidden();

        $this->assertDatabaseHas('products', ['id' => $id, 'price' => 800]);
    }

    public function test_admins_can_create_products_with_a_price_list(): void
    {
        $this->actingAs($this->createAdmin(), 'sanctum')
            ->postJson('/api/products', $this->payload())
            ->assertCreated()
            ->assertJsonPath('prices.huf.list', 164000)
            ->assertJsonPath('prices.huf.final', 131200);

        $this->assertDatabaseHas('products', ['slug' => 'new-phone', 'stock' => 7]);
    }

    public function test_product_input_is_validated(): void
    {
        $this->actingAs($this->createAdmin(), 'sanctum')
            ->postJson('/api/products', ['name' => 'x'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category', 'name', 'slug', 'description', 'image', 'price', 'stock']);
    }

    public function test_admins_can_update_a_product_price(): void
    {
        $id = $this->createProduct();

        $this->actingAs($this->createAdmin(), 'sanctum')
            ->patchJson("/api/products/$id", ['price' => 1000, 'discount' => 0])
            ->assertOk()
            ->assertJsonPath('prices.eur.final', 850);

        $this->getJson("/api/products/prices?ids=$id")->assertJsonPath("$id.prices.eur.final", 850);
    }

    public function test_admins_can_delete_products(): void
    {
        $id = $this->createProduct();

        $this->actingAs($this->createAdmin(), 'sanctum')
            ->deleteJson("/api/products/$id")
            ->assertOk();

        $this->assertDatabaseMissing('products', ['id' => $id]);
    }

    public function test_the_admin_flag_cannot_be_mass_assigned(): void
    {
        $user = User::factory()->create();
        $user->update(['is_admin' => true]);

        $this->assertFalse((bool) DB::table('users')->where('id', $user->id)->value('is_admin'));
    }
}