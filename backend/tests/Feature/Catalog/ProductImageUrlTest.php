<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Support\ImageUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesCommerceData;
use Tests\TestCase;

class ProductImageUrlTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
        config(['catalog.image_base_url' => 'https://cdn.example.com/']);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'category' => 'phones',
            'name' => 'Image phone',
            'slug' => 'image-phone',
            'description' => 'A phone with a long enough description.',
            'image' => '/images/image-phone.jpg',
            'price' => 500,
            'discount' => 0,
            'stock' => 3,
        ], $overrides);
    }

    public function test_relative_paths_use_the_configured_base_url(): void
    {
        $id = $this->createProduct();

        $this->assertSame(
            'https://cdn.example.com/images/test-product.jpg',
            Product::find($id)->image
        );
    }

    public function test_absolute_urls_are_kept_unchanged(): void
    {
        $id = $this->createProduct();

        DB::table('products')->where('id', $id)->update([
            'image' => 'https://other.example.org/a.jpg',
        ]);

        $this->assertSame('https://other.example.org/a.jpg', Product::find($id)->image);
    }

    public function test_gallery_images_are_resolved_and_missing_values_are_empty(): void
    {
        $id = $this->createProduct();

        $this->assertSame([], Product::find($id)->gallery_images);

        DB::table('products')->where('id', $id)->update([
            'gallery_images' => json_encode(['/images/one.jpg', 'https://other.example.org/two.jpg']),
        ]);

        $this->assertSame([
            'https://cdn.example.com/images/one.jpg',
            'https://other.example.org/two.jpg',
        ], Product::find($id)->gallery_images);
    }

    public function test_the_api_returns_absolute_image_urls(): void
    {
        $this->createProduct();

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonPath('products.0.image', 'https://cdn.example.com/images/test-product.jpg');
    }

    public function test_the_base_url_is_not_hardcoded(): void
    {
        $id = $this->createProduct();

        config(['catalog.image_base_url' => 'https://shop.example.net']);

        $this->assertSame(
            'https://shop.example.net/images/test-product.jpg',
            Product::find($id)->image
        );
    }

    public function test_helper_edge_cases(): void
    {
        $this->assertNull(ImageUrl::resolve(null));
        $this->assertNull(ImageUrl::resolve('   '));
        $this->assertSame('https://cdn.test/a.jpg', ImageUrl::resolve('//cdn.test/a.jpg'));
        $this->assertSame('https://cdn.example.com/a.jpg', ImageUrl::resolve('a.jpg'));
        $this->assertSame([], ImageUrl::resolveMany('not json'));
    }

    public function test_admins_can_store_relative_paths_and_absolute_urls(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/products', $this->payload())
            ->assertCreated()
            ->assertJsonPath('image', 'https://cdn.example.com/images/image-phone.jpg');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/products', $this->payload([
                'slug' => 'image-phone-2',
                'image' => 'https://img.example.org/phone.jpg',
            ]))
            ->assertCreated()
            ->assertJsonPath('image', 'https://img.example.org/phone.jpg');
    }

    public function test_unsafe_image_values_are_rejected(): void
    {
        $admin = $this->createAdmin();

        foreach (['javascript:alert(1)', '/images/../secret.png', 'data:image/png;base64,AAAA', 'images/no-slash.jpg'] as $value) {
            $this->actingAs($admin, 'sanctum')
                ->postJson('/api/products', $this->payload(['image' => $value]))
                ->assertStatus(422)
                ->assertJsonValidationErrors('image');
        }

        $this->assertDatabaseCount('products', 0);
    }
}