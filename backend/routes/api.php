<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductsController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\StripeWebhookController;
use App\Models\Product;

Route::prefix('products')->group(function () {
    Route::get('/new', [ProductsController::class, 'getNewArrivals']);

    Route::get('/discounted', [ProductsController::class, 'getDiscountedProducts']);

    Route::get('/categories', [ProductsController::class, 'getCategories']);

    Route::get('/prices', [ProductsController::class, 'getPrices'])
        ->middleware('throttle:60,1');

    Route::get('/category/{category}', function ($category) {
        $products = Product::where('category', $category)->get();

        if ($products->isEmpty()) {
            return response()->json([
                'message' => 'No products found for this category',
            ], 404);
        }

        return response()->json($products);
    });

    Route::post('/', [ProductsController::class, 'store'])
        ->middleware(['auth:sanctum', 'admin']);

    Route::get('/', [ProductsController::class, 'index']);

    Route::get('/{id}/comments', [ProductsController::class, 'getComments']);

    Route::post('/{id}/comments', [ProductsController::class, 'addComment'])
        ->middleware('auth:sanctum');

    Route::patch('/{id}', [ProductsController::class, 'update'])
        ->middleware(['auth:sanctum', 'admin']);

    Route::delete('/{id}', [ProductsController::class, 'destroy'])
        ->middleware(['auth:sanctum', 'admin']);

    Route::get('/{slug}', [ProductsController::class, 'show']);
});

Route::post('/users/register', [UsersController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/users/login', [UsersController::class, 'login'])
    ->middleware('throttle:5,1');

Route::post('/users/logout', [UsersController::class, 'logout'])
    ->middleware('auth:sanctum');

Route::get('/users/me', [UsersController::class, 'getAuthenticatedUser'])
    ->middleware('auth:sanctum');

Route::patch('/users/profile', [UsersController::class, 'updateProfile'])
    ->middleware('auth:sanctum');

Route::post('/users/change-password', [UsersController::class, 'changePassword'])
    ->middleware('auth:sanctum');

Route::post('/password/forgot', [PasswordController::class, 'sendResetLink']);

Route::post('/password/reset', [PasswordController::class, 'reset']);

Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::post('/email/resend', [VerificationController::class, 'resend'])
    ->middleware(['auth:sanctum', 'throttle:6,1'])
    ->name('verification.send');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);

    Route::get('/orders/{order}', [OrderController::class, 'show']);

    Route::post('/orders', [OrderController::class, 'store']);

    Route::post('/checkout/create-intent', [PaymentController::class, 'createPaymentIntent']);

    Route::post('/orders/finalize', [OrderController::class, 'finalize'])
        ->name('orders.finalize');

    Route::post('/orders/{order}/retry', [OrderController::class, 'retryPayment']);

    Route::post('/order/{orderId}/refund', [OrderController::class, 'requestRefund']);
});

Route::post('/stripe/webhook', [StripeWebhookController::class, 'handleWebhook']);