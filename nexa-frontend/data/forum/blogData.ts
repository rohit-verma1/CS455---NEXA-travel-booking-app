import { Blog } from '@/types/forum';

export const blogData: Blog[] = [
  {
    id: 'mumbai-csmt',
    title: 'Mumbai\'s Heartbeat: Discovering the Iconic Chhatrapati Shivaji Maharaj Terminus',
    station: 'Mumbai',
    category: 'mumbai',
    image: '/resources/blog-1.jpg',
    excerpt: 'Explore the magnificent UNESCO World Heritage site that embodies the spirit of Mumbai through its stunning Victorian Gothic architecture.',
    readTime: '8 min read',
    tags: ['Heritage', 'Architecture', 'UNESCO'],
    createdAt: '2025-11-10T18:17:54.128391Z',
    content: `
      <div class="prose prose-lg max-w-none">
        <p class="text-xl text-gray-600 mb-6">Welcome to the bustling, vibrant heart of Mumbai! While the city itself is an explosion of sights and sounds, there's one 'station' that truly encapsulates its spirit, history, and ceaseless energy: the magnificent <strong>Chhatrapati Shivaji Maharaj Terminus (CSMT)</strong>.</p>
        
        <img src="/resources/blog-1.jpg" alt="CSMT Architecture" class="w-full h-64 object-cover rounded-lg mb-6">
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">The Grandeur and the Buzz</h3>
        <p class="mb-4">Stepping out at CSMT is like walking onto a movie set, but with real-life drama unfolding all around you. The station's Victorian Gothic Revival architecture, with its intricate carvings, grand domes, and majestic turrets, is simply breathtaking.</p>
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Explore Mumbai's Treasures</h3>
        <ul class="list-disc pl-6 mb-6 space-y-2">
          <li><strong>Gateway of India & Apollo Bunder:</strong> Mumbai's most famous monument, facing the Arabian Sea</li>
          <li><strong>Colaba Causeway:</strong> A shopper's paradise and foodie's delight</li>
          <li><strong>Kala Ghoda Art Precinct:</strong> Home to art galleries and stunning colonial buildings</li>
          <li><strong>Marine Drive:</strong> The iconic 'Queen's Necklace' perfect for sunset walks</li>
        </ul>
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Travel Tips</h3>
        <div class="bg-blue-50 p-6 rounded-lg mb-6">
          <p><strong>Best Time:</strong> Early mornings or evenings for photography, avoid rush hours</p>
          <p><strong>Photography:</strong> Don't forget your camera - countless stunning opportunities await!</p>
          <p><strong>Heritage:</strong> Recognized as a UNESCO World Heritage site since 2004</p>
        </div>
      </div>
    `
  },
  {
    id: 'delhi-station',
    title: 'Delhi Station: Your Gateway to the Soul of Old Delhi',
    station: 'Delhi',
    category: 'delhi',
    image: '/resources/blog-2.jpg',
    excerpt: 'Step into the living, breathing monument to India\'s bustling spirit at Old Delhi Railway Station.',
    readTime: '6 min read',
    tags: ['History', 'Culture', 'Food'],
    createdAt: '2025-11-10T18:18:04.817982Z',
    content: `
      <div class="prose prose-lg max-w-none">
        <p class="text-xl text-gray-600 mb-6">Stepping off the train at Old Delhi Railway Station (DLI) isn't just arriving in a city; it's an immersion into the living, breathing heart of India's capital.</p>
        
        <img src="/resources/blog-2.jpg" alt="Delhi Station" class="w-full h-64 object-cover rounded-lg mb-6">
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">The Heartbeat of a Nation</h3>
        <p class="mb-4">Old Delhi Railway Station is more than just a train station; it's a historic landmark built in 1864. Its grand, red-brick Mughal-style architecture tells tales of a bygone era.</p>
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Must-Visit Attractions Nearby</h3>
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-red-50 p-4 rounded-lg">
            <h4 class="font-bold text-red-800">Red Fort</h4>
            <p class="text-sm">UNESCO World Heritage site directly across the road</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-bold text-green-800">Jama Masjid</h4>
            <p class="text-sm">One of India's largest and most awe-inspiring mosques</p>
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg">
            <h4 class="font-bold text-yellow-800">Chandni Chowk</h4>
            <p class="text-sm">Labyrinthine bazaar with incredible street food</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <h4 class="font-bold text-purple-800">Parathe Wali Gali</h4>
            <p class="text-sm">Famous lane for delicious stuffed flatbreads</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'chennai-central',
    title: 'Chennai Central: Your Grand Gateway to the Heart of the South!',
    station: 'Chennai',
    category: 'chennai',
    image: '/resources/blog-3.jpg',
    excerpt: 'Discover the magnificent red-brick marvel that serves as the bustling gateway to South India.',
    readTime: '7 min read',
    tags: ['South India', 'Colonial', 'Gateway'],
    createdAt: '2025-11-10T18:18:19.061323Z',
    content: `
      <div class="prose prose-lg max-w-none">
        <p class="text-xl text-gray-600 mb-6">Step off the train at MGR Chennai Central Railway Station – a magnificent red-brick marvel that's more than just a transit point. It's the bustling, beating heart of South India!</p>
        
        <img src="/resources/blog-3.jpg" alt="Chennai Central" class="w-full h-64 object-cover rounded-lg mb-6">
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">The Grand Welcome</h3>
        <p class="mb-4">From the moment you arrive, you'll feel the pulse of Chennai. Its striking Gothic-style, red-brick architecture, completed in 1873, harks back to the British colonial era.</p>
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Prime Attractions</h3>
        <ul class="list-disc pl-6 mb-6 space-y-2">
          <li><strong>Ripon Building:</strong> Stunning Indo-Saracenic architecture</li>
          <li><strong>Fort St. George:</strong> First English fortress in India</li>
          <li><strong>Government Museum:</strong> Rich Tamil Nadu heritage</li>
          <li><strong>Parry's Corner:</strong> Vibrant local markets</li>
        </ul>
      </div>
    `
  },
  {
    id: 'ahmedabad-gateway',
    title: 'First Stop, Ahmedabad: Your Gateway to Gujarat\'s Heritage & Flavors!',
    station: 'Ahmedabad',
    category: 'ahmedabad',
    image: '/resources/blog-4.jpg',
    excerpt: 'Begin your Gujarati adventure at Ahmedabad Railway Station, your gateway to heritage and culinary delights.',
    readTime: '6 min read',
    tags: ['Gujarat', 'Heritage', 'Food'],
    createdAt: '2025-11-10T18:18:39.021598Z',
    content: `
      <div class="prose prose-lg max-w-none">
        <p class="text-xl text-gray-600 mb-6">Namaste! If you're planning a trip to vibrant Gujarat, your journey begins at Ahmedabad Railway Station (ADI) - a true microcosm of India's incredible energy.</p>
        
        <img src="/resources/blog-4.jpg" alt="Ahmedabad Heritage" class="w-full h-64 object-cover rounded-lg mb-6">
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Heritage Walks</h3>
        <p class="mb-4">Ahmedabad is India's first UNESCO World Heritage City. Don't miss the intricate stone latticework of <strong>Sidi Saiyyed Mosque</strong> and the historic <strong>Bhadra Fort</strong>.</p>
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Foodie Paradise</h3>
        <div class="bg-orange-50 p-6 rounded-lg mb-6">
          <p class="font-bold text-orange-800 mb-2">Must-Try Foods:</p>
          <ul class="list-disc pl-6 space-y-1">
            <li>Pav Bhaji at Manek Chowk</li>
            <li>Authentic Gujarati Thali</li>
            <li>Ghugra and various chaats</li>
            <li>Traditional 'gola' (ice treats)</li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: 'kanpur-central',
    title: 'Beyond the Platforms: Discovering Kanpur from its Heart, Kanpur Central!',
    station: 'Kanpur',
    category: 'kanpur',
    image: '/resources/blog-5.jpg',
    excerpt: 'Your adventure truly kicks off at the grand old Kanpur Central Railway Station - more than just a stopover!',
    readTime: '5 min read',
    tags: ['Uttar Pradesh', 'Industrial', 'Local'],
    createdAt: '2025-11-10T18:17:23.635166Z',
    content: `
      <div class="prose prose-lg max-w-none">
        <p class="text-xl text-gray-600 mb-6">Hey fellow travelers! Your adventure in Kanpur truly kicks off at the grand old <strong>Kanpur Central Railway Station (CNB)</strong> - your bustling gateway to the 'Manchester of the East'!</p>
        
        <img src="/resources/blog-5.jpg" alt="Kanpur Central" class="w-full h-64 object-cover rounded-lg mb-6">
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Local Attractions</h3>
        <ul class="list-disc pl-6 mb-6 space-y-2">
          <li><strong>JK Temple:</strong> Beautifully designed modern temple with stunning architecture</li>
          <li><strong>Ganga Barrage:</strong> Breathtaking views of the Ganges, especially at sunset</li>
          <li><strong>Nana Rao Park:</strong> Historical park with lush greenery and memorials</li>
          <li><strong>Moti Jheel:</strong> Picturesque lake perfect for evening relaxation</li>
        </ul>
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Shopping & Food</h3>
        <p class="mb-4">Kanpur is famous for its leather products - explore local markets for quality bags, shoes, and jackets. Don't miss the iconic <strong>'Thaggu Ke Laddu'</strong> and local chaats!</p>
      </div>
    `
  },
  {
    id: 'chandigarh-gateway',
    title: 'Chandigarh Station: Your Smooth Gateway to India\'s Most Planned City!',
    station: 'Chandigarh',
    category: 'chandigarh',
    image: '/resources/blog-6.jpg',
    excerpt: 'Welcome to the clean, efficient, and welcoming hub that sets the tone for your architectural adventure.',
    readTime: '6 min read',
    tags: ['Planned City', 'Architecture', 'Modern'],
    createdAt: '2025-11-10T18:17:43.001208Z',
    content: `
      <div class="prose prose-lg max-w-none">
        <p class="text-xl text-gray-600 mb-6">Ever dreamt of exploring a city where every brick tells a story of meticulous planning? Welcome to Chandigarh, sculpted by legendary architect Le Corbusier.</p>
        
        <img src="/resources/blog-6.jpg" alt="Chandigarh Architecture" class="w-full h-64 object-cover rounded-lg mb-6">
        
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Architectural Marvels</h3>
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-bold text-blue-800">Rock Garden</h4>
            <p class="text-sm">Nek Chand's wonderland of art from industrial waste</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-bold text-green-800">Sukhna Lake</h4>
            <p class="text-sm">Tranquil oasis perfect for boating and sunset views</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <h4 class="font-bold text-purple-800">Capitol Complex</h4>
            <p class="text-sm">UNESCO World Heritage site showcasing Le Corbusier's genius</p>
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg">
            <h4 class="font-bold text-yellow-800">Sector 17 Plaza</h4>
            <p class="text-sm">Heart of Chandigarh's commercial and social life</p>
          </div>
        </div>
      </div>
    `
  }
];
