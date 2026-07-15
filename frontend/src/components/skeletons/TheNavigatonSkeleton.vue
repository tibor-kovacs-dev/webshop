<template>
  <header class="animate-pulse"> 
    
    <div class="lg:hidden">
      <nav class="bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-2xl">
        <div class="flex justify-between items-center p-4">
          
          <div class="h-5 w-24 bg-indigo-300 rounded-sm"></div>

          <div class="h-6 w-10 bg-indigo-300 rounded-sm"></div>

          <div class="flex gap-4">
            <div class="h-6 w-6 bg-indigo-300 rounded-full"></div> 
            <div class="h-6 w-6 bg-indigo-300 rounded-full"></div> 
            <div class="relative">
              <div class="h-6 w-6 bg-indigo-300 rounded-full"></div>
              <div class="h-4 w-4 bg-red-400 rounded-full absolute -top-1 -right-1"></div>
            </div>
            <div class="h-6 w-6 bg-indigo-300 rounded-sm"></div> 
          </div>

        </div>
        
        <ul class="pt-2 pb-4">
          <li v-for="n in 3" :key="n" class="uppercase text-center py-3 text-md">
            <div class="h-4 w-32 bg-indigo-400 mx-auto rounded-sm"></div>
          </li>
        </ul>
      </nav>
    </div>

    <div class="hidden lg:block">
      
      <div class="p-2 text-center bg-amber-500 text-white">
        <div class="h-4 w-48 bg-amber-300 mx-auto rounded-sm"></div>
      </div>
      
      <nav class="flex items-center justify-center gap-x-8 flex-wrap py-1 text-white font-bold bg-gradient-to-r from-sky-500 to-indigo-500 uppercase">
        
        <div class="h-5 w-28 bg-indigo-300 rounded-sm"></div>
        
        <ul class="flex gap-x-8 items-center">
          <li v-for="n in 4" :key="n" class="py-3 text-md">
            <div class="h-4 w-20 bg-indigo-400 rounded-sm"></div>
          </li>
        </ul>
        
        <div class="flex gap-5">
          <div class="h-6 w-10 bg-indigo-300 rounded-sm"></div>
          <div class="flex gap-4">
            <div class="h-6 w-6 bg-indigo-300 rounded-full"></div> 
            <div class="h-6 w-6 bg-indigo-300 rounded-full"></div> 
            <div class="relative">
              <div class="h-6 w-6 bg-indigo-300 rounded-full"></div>
              <div class="h-4 w-4 bg-red-400 rounded-full absolute -top-1 -right-1"></div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>