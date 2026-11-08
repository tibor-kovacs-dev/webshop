<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('products')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        DB::table('products')->insert([
            [
                'category' => 'Electronics',
                'name' => 'Smartphone XYZ',
                'slug' => 'smartphone-xyz',
                'description' => json_encode([
                    'en' => 'The Smartphone XYZ is the latest innovation in mobile technology offering 5G, 48MP camera and all-day battery life.',
                    'de' => 'Das Smartphone XYZ ist die neueste Innovation...',
                    'hu' => 'Az XYZ okostelefon a legújabb innováció...'
                ]),
                'image' => '/images/smartphone-xyz.webp',
                'gallery_images' => json_encode([
                    '/images/smartphone1.webp',
                    '/images/smartphone2.webp',
                    '/images/smartphone3.webp'
                ]),
                'price' => 800,
                'stock' => 50,
                'rating_rate' => 4.50,
                'rating_count' => 120,
                'discount' => 10.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Electronics',
                'name' => 'Laptop ABC',
                'slug' => 'laptop-abc',
                'description' => json_encode([
                    'en' => 'Laptop ABC is designed for professionals and gamers.',
                    'de' => 'Der Laptop ABC wurde für Profis entwickelt.',
                    'hu' => 'Az Laptop ABC szakembereknek készült.'
                ]),
                'image' => '/images/laptop-abc.webp',
                'gallery_images' => null,
                'price' => 1300,
                'stock' => 30,
                'rating_rate' => 4.70,
                'rating_count' => 95,
                'discount' => 15.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Home Appliances',
                'name' => 'Blender 2000',
                'slug' => 'blender-2000',
                'description' => json_encode([
                    'en' => 'Essential kitchen tool for smoothies, soups and sauces.',
                    'de' => 'Unverzichtbares Küchenwerkzeug.',
                    'hu' => 'Alapvető konyhai eszk.'
                ]),
                'image' => '/images/blender-2000.webp',
                'gallery_images' => null,
                'price' => 150,
                'stock' => 100,
                'rating_rate' => 4.20,
                'rating_count' => 200,
                'discount' => 5.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Furniture',
                'name' => 'Office Chair Comfort',
                'slug' => 'office-chair-comfort',
                'description' => json_encode([
                    'en' => 'Ergonomic chair for long working hours.',
                    'de' => 'Ergonomischer Bürostuhl.',
                    'hu' => 'Ergonomikus irodai szék.'
                ]),
                'image' => '/images/office-chair-comfort.avif',
                'gallery_images' => null,
                'price' => 200,
                'stock' => 20,
                'rating_rate' => 4.80,
                'rating_count' => 50,
                'discount' => 20.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Electronics',
                'name' => 'Smartwatch V2',
                'slug' => 'smartwatch-v2',
                'description' => json_encode([
                    'en' => 'Fitness tracking and smart notifications.',
                    'de' => 'Fitness-Tracking und Smart Notifications.',
                    'hu' => 'Fitnesz és okos értesítések.'
                ]),
                'image' => '/images/smartwatch-v2.webp',
                'gallery_images' => null,
                'price' => 250,
                'stock' => 60,
                'rating_rate' => 4.30,
                'rating_count' => 75,
                'discount' => 10.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Electronics',
                'name' => 'Wireless Earbuds Pro',
                'slug' => 'wireless-earbuds-pro',
                'description' => json_encode([
                    'en' => 'High-quality sound with noise cancellation.',
                ]),
                'image' => '/images/wireless-earbuds-pro.webp',
                'gallery_images' => null,
                'price' => 130,
                'stock' => 200,
                'rating_rate' => 4.60,
                'rating_count' => 150,
                'discount' => 5.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Home Appliances',
                'name' => 'Coffee Maker Elite',
                'slug' => 'coffee-maker-elite',
                'description' => json_encode([
                    'en' => 'Perfect coffee every time.',
                ]),
                'image' => '/images/coffee-maker-elite.webp',
                'gallery_images' => null,
                'price' => 180,
                'stock' => 80,
                'rating_rate' => 4.40,
                'rating_count' => 90,
                'discount' => 10.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Furniture',
                'name' => 'Adjustable Standing Desk',
                'slug' => 'adjustable-standing-desk',
                'description' => json_encode([
                    'en' => 'Switch between sitting and standing easily.',
                ]),
                'image' => '/images/standing-desk.webp',
                'gallery_images' => null,
                'price' => 350,
                'stock' => 50,
                'rating_rate' => 4.70,
                'rating_count' => 120,
                'discount' => 15.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Home Appliances',
                'name' => 'Air Purifier 5000',
                'slug' => 'air-purifier-5000',
                'description' => json_encode([
                    'en' => 'Keeps your air clean and fresh.',
                ]),
                'image' => '/images/air-purifier-5000.webp',
                'gallery_images' => null,
                'price' => 300,
                'stock' => 40,
                'rating_rate' => 4.50,
                'rating_count' => 110,
                'discount' => 20.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'category' => 'Electronics',
                'name' => '4K TV 55',
                'slug' => '4k-tv-55',
                'description' => json_encode([
                    'en' => 'Ultra HD cinematic experience.',
                ]),
                'image' => '/images/4k-tv-55.webp',
                'gallery_images' => null,
                'price' => 700,
                'stock' => 25,
                'rating_rate' => 4.80,
                'rating_count' => 200,
                'discount' => 10.00,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}