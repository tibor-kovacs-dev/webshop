<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_authenticate_using_the_login_endpoint(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/users/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure(['user' => ['id', 'email', 'token']]);
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/users/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response
            ->assertUnauthorized()
            ->assertJson(['message' => 'Invalid email or password']);
    }

    public function test_logging_in_again_revokes_the_previous_token(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
        ]);

        $first = $this->postJson('/api/users/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertCount(1, $user->fresh()->tokens);

        $second = $this->postJson('/api/users/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $first->assertOk();
        $second->assertOk();
        $this->assertCount(1, $user->fresh()->tokens);
        $this->assertNotSame(
            $first->json('user.token'),
            $second->json('user.token'),
        );
    }
}