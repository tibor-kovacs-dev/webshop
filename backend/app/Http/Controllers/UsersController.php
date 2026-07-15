<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth; // Hozzáadva az Auth::user() használatához
use Illuminate\Auth\Events\Registered;

class UsersController extends Controller
{
    public function register(Request $request)
    {
        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,  
            'email' => $request->email,
            'password' => Hash::make($request->password),
            
            'phone' => $request->phone,
            'zipcode' => $request->zipcode,
            'city' => $request->city,
            'street' => $request->street,
            'house_number' => $request->house_number,
            'apartment' => $request->apartment,
        ]);

        event(new Registered($user));

        return response()->noContent();
    }

    public function getAuthenticatedUser(Request $request)
    {
        if ($request->user()) {
            return response()->json(['user' => $request->user()]);
        }
        
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    public function login(Request $request){
        $email = $request->input('email');
        $password = $request->input('password');

        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $email)->first();

        if(!$user || !Hash::check($password, $password ? $user->password: '')){
            return response()->json([
                'message' => 'Invalid email or password'
            ], 401);
        }

        $user->tokens()->delete();
        $user->token = $user->createToken('access')->plainTextToken;

        return response()->json([
            'user' => $user
        ]);
    }

    public function index(){
        $users = User::all();
        return response()->json(['users' => $users]);
    }
}