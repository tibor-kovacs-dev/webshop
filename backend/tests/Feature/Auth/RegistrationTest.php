<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Auth\Events\Registered;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_can_register(): void
    {
        Event::fake();

        $response = $this->postJson('/api/users/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertNoContent();

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        Event::assertDispatched(Registered::class);
    }

    public function test_registering_does_not_log_the_user_in(): void
    {
        // The register endpoint only creates the account and fires the
        // Registered event (for email verification) — it does not return
        // a token, so the frontend needs a separate login call afterwards.
        $response = $this->postJson('/api/users/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test2@example.com',
            'password' => 'password',
        ]);

        $response->assertNoContent();

        $user = User::where('email', 'test2@example.com')->first();
        $this->assertCount(0, $user->tokens);
    }
}