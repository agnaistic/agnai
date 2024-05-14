import { Component } from 'solid-js'

const FeaturedCreator: Component = () => {
  return (
    <div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-purple-800 to-black p-4 text-white">
      <h2 class="mb-2 text-3xl font-bold">FEATURED CREATOR</h2>
      <h1 class="mb-4 text-6xl font-extrabold">
        Candice Nice as <span class="text-red-600">HARLEY QUINN</span>
      </h1>
      <p class="mb-6 max-w-lg text-center">
        Hi! I'm Candice Nice and I'm all about bringing characters to life through cosplay! One of
        my absolute favorites to dress as is the superhot Harley Quinn because her vibrant style
        just speaks to me. But you know what? My cosplay journey doesn't stop at Harley. I find joy
        in transforming into all sorts of characters, from magical creatures to...
        <button class="text-red-600 hover:underline">Read More</button>
      </p>
      <div class="mb-6 flex flex-col items-center">
        <div class="mb-2">
          <button class="rounded-full bg-yellow-500 px-4 py-2 font-bold text-black hover:bg-yellow-400">
            Subscribe and gain ACCESS to daily uploaded content!
          </button>
        </div>
        <div>
          <button class="rounded-full bg-yellow-500 px-4 py-2 font-bold text-black hover:bg-yellow-400">
            Live Messaging 24/7!
          </button>
        </div>
      </div>
      <button class="mb-4 rounded-full bg-blue-600 px-6 py-2 font-bold hover:bg-blue-500">
        Register For Free
      </button>
      <a href="#" class="text-display text-red-600 hover:underline">
        See Profile{' >'}
      </a>
    </div>
  )
}

export default FeaturedCreator
