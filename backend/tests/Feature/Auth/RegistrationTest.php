<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $overrides);
    }

    public function test_new_users_can_register(): void
    {
        Event::fake([Registered::class]);

        $this->postJson('/api/users/register', $this->payload())->assertNoContent();

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        Event::assertDispatched(Registered::class);
    }

    public function test_registering_does_not_log_the_user_in(): void
    {
        $this->postJson('/api/users/register', $this->payload(['email' => 'test2@example.com']))
            ->assertNoContent();

        $this->assertGuest('web');
    }

    public function test_email_is_normalized_and_must_be_unique(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/users/register', $this->payload(['email' => '  TAKEN@example.com ']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_password_confirmation_must_match(): void
    {
        $this->postJson('/api/users/register', $this->payload(['password_confirmation' => 'different']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');

        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }

    public function test_password_must_be_long_enough(): void
    {
        $this->postJson('/api/users/register', $this->payload([
            'password' => 'short',
            'password_confirmation' => 'short',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_required_fields_are_validated(): void
    {
        $this->postJson('/api/users/register', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'password']);
    }

    public function test_new_users_are_not_administrators(): void
    {
        $this->postJson('/api/users/register', $this->payload(['is_admin' => true]))->assertNoContent();

        $this->assertFalse((bool) User::where('email', 'test@example.com')->value('is_admin'));
    }
}