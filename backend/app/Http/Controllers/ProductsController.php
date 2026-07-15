<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Http\Requests\ProductRequest;
use App\Models\Review;
use Illuminate\Http\Request;

class ProductsController extends Controller
{

    public function index(){
        $products = Product::all();
        return response()->json(['products' => $products]);
    }

    public function show($id)
    {
        try {
        $product = Product::find($id);

        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        return response()->json($product);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
    }

    public function getCategories()
    {
        $categories = Product::select('category')
        ->distinct()
        ->pluck('category')
        ->toArray();
        
        return response()->json($categories);
    }
    
    public function getNewArrivals(Request $request)
    {
        $limit = $request->query('limit', 8); 

        $products = Product::orderBy('created_at', 'desc')
                           ->limit($limit)
                           ->get();

        return response()->json($products);
    }

    public function getDiscountedProducts(Request $request)
    {
        $limit = $request->query('limit', 8); 

        $products = Product::where('discount', '>', 0)
                           ->orderBy('discount', 'desc')
                           ->limit($limit)
                           ->get();

        return response()->json($products);
    }

    public function getComments($id)
    {
        $comments = Review::where('product_id', $id)
        ->with('user:id,first_name,last_name') 
        ->latest() 
        ->get();
    
        return response()->json($comments);
    }

    public function addComment(Request $request, $id)
    {
        $validatedData = $request->validate([
            'rating' => 'required|integer|min:1|max:5', 
            'comment_text' => 'required|string|max:1000',
        ]);

        $userId = $request->user()->id;
        $validatedData['product_id'] = $id;
        $validatedData['user_id'] = $userId;
        
        $review = Review::updateOrCreate(
            [
                'product_id' => $id,
                'user_id' => $userId
            ], 
            $validatedData 
        );

        $statusCode = $review->wasRecentlyCreated ? 201 : 200;

        $review->load('user:id,first_name,last_name'); 

        return response()->json($review, $statusCode); 
    }
}