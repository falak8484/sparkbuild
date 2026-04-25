import { uid } from "./common.js";

// ─── Image Fetching ────────────────────────────────────────────────────────────
const UNSPLASH_BASE = "https://source.unsplash.com/featured/";
const PEXELS_BASE   = "https://images.pexels.com/photos/";

// Build Unsplash URLs by keyword (no API key needed)
function unsplashUrl(keywords, w=800, h=600) {
  const q = encodeURIComponent(keywords.replace(/\s+/g,','));
  return `https://source.unsplash.com/${w}x${h}/?${q}`;
}

// Curated Pexels photo IDs per category (free, no key needed via direct URL)
const PEXELS_IDS = {
  bakery:    [3724958,1126359,205961,1070850,239581,1793035,718739,1027589],
  cake:      [1854652,913573,1721932,2373985,3181531,339560,1414235,3407777],
  bread:     [1775043,2097090,1359330,2068166,461060,1640770,706553,913367],
  flower:    [931177,931177,56866,931177,56866,931177,2879536,931177],
  portfolio: [1181533,1181467,3182812,3184405,8374207,3184339,3183150,3182781],
  business:  [3184405,3182812,1181533,3183150,3182781,1181467,8374207,3184339],
  college:   [1438072,1595391,1181533,267885,2681319,3401903,1438072,1595391],
  ecommerce: [1639729,3621780,3622608,3945667,1183266,3945671,3621780,1639729],
  birthday:  [1729931,796602,1729931,3617457,796602,1729931,3617457,796602],
  blog:      [6685358,4226896,267669,3422303,4226896,6685358,3422303,267669],
  food:      [1640772,1410235,1640777,1435735,958545,3682217,1640772,1410235],
  candle:    [3933256,3933250,3933251,3933252,3933253,3933254,3933255,3933256],
  landing:   [3184339,1181533,3182812,3184405,8374207,3183150,3182781,1181467],
  wellness:  [3756165,3757942,3757942,3756165,4041279,3757942,3756165,3757942],
  default:   [1181533,3182812,3184405,3183150,3182781,1181467,8374207,3184339]
};

function pexelsUrl(category, w=800, h=600) {
  const ids = PEXELS_IDS[category] || PEXELS_IDS.default;
  const id = ids[Math.floor(Math.random() * ids.length)];
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
}

function seededPexelsUrl(category, seed, w=800, h=600) {
  const ids = PEXELS_IDS[category] || PEXELS_IDS.default;
  const id = ids[seed % ids.length];
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
}

// ─── Site Type Detection ───────────────────────────────────────────────────────
const TYPE_SIGNALS = {
  bakery:     /bak(ery|ed?)|pastry|pastries|bread|croissant|sourdough|cake shop|donut|muffin|biscuit|cupcake/i,
  ecommerce:  /shop|store|e-?comm|product|sell|buy|cart|order online|marketplace|merchandise/i,
  portfolio:  /portfolio|my work|photographer|designer|developer|freelance|showcase|artist|creative|illustrator/i,
  college:    /college|university|academy|school|campus|student|courses?|faculty|admission|education|institute/i,
  birthday:   /birthday|bday|turning \d+|anniversary|celebrate|celebration|party|milestone|wedding|special day/i,
  blog:       /blog|journal|article|post|write|writer|editorial|newsletter|magazine|diary/i,
  restaurant: /restaurant|cafe|coffee|food|dining|menu|eat|cuisine|bistro|eatery|diner/i,
  flower:     /flower|florist|bouquet|floral|bloom|petal|rose|arrangement|wedding flower/i,
  landing:    /startup|app|saas|product launch|launch|waitlist|sign.?up|campaign|ad|promo/i,
  wellness:   /wellness|yoga|spa|fitness|gym|health|meditat|therapy|candle|holistic|beauty|skincare/i,
  business:   /business|company|agency|service|consult|firm|brand|professional|corporate|office/i,
};

export function detectWebsiteType(prompt) {
  const lower = prompt.toLowerCase();
  for (const [type, regex] of Object.entries(TYPE_SIGNALS)) {
    if (regex.test(lower)) return type;
  }
  return 'business';
}

// ─── Image Category Mapping ────────────────────────────────────────────────────
const TYPE_TO_IMG_CATEGORY = {
  bakery:     'bakery',
  ecommerce:  'ecommerce',
  portfolio:  'portfolio',
  college:    'college',
  birthday:   'birthday',
  blog:       'blog',
  restaurant: 'food',
  flower:     'flower',
  landing:    'landing',
  wellness:   'wellness',
  business:   'business',
  default:    'default'
};

// ─── Color Palettes per type ───────────────────────────────────────────────────
const TYPE_PALETTES = {
  bakery:     { primary:'#d4896a', bg:'#fdf6ee', surface:'#fffbf4', accent:'#f9ead8', text:'#3d1f0a' },
  ecommerce:  { primary:'#7a9ecb', bg:'#f4f7fb', surface:'#fafcff', accent:'#e8f0f8', text:'#1c2a3a' },
  portfolio:  { primary:'#6b7280', bg:'#f8f9fa', surface:'#ffffff', accent:'#f1f3f5', text:'#1a1a2e' },
  college:    { primary:'#5b84b1', bg:'#f4f7fb', surface:'#fafcff', accent:'#e8eff8', text:'#1a2a40' },
  birthday:   { primary:'#e07caa', bg:'#fff5f9', surface:'#fffafe', accent:'#fde8f2', text:'#3a1128' },
  blog:       { primary:'#7c8fa6', bg:'#f7f8fa', surface:'#ffffff', accent:'#edf0f4', text:'#1e2a35' },
  restaurant: { primary:'#b06f4a', bg:'#fdf5ee', surface:'#fffbf7', accent:'#f5e8d8', text:'#2d1200' },
  flower:     { primary:'#c47fa8', bg:'#fff8fc', surface:'#fffcfe', accent:'#fce8f4', text:'#3a1030' },
  landing:    { primary:'#5e6ad2', bg:'#f5f5ff', surface:'#fafaff', accent:'#ebebff', text:'#1a1a3e' },
  wellness:   { primary:'#7dbfa6', bg:'#f4fbf8', surface:'#fafff9', accent:'#e4f5ee', text:'#1a3028' },
  business:   { primary:'#5b8a6b', bg:'#f5faf7', surface:'#fafffc', accent:'#e8f4ee', text:'#1a3025' },
};

// ─── Page Structures per type ──────────────────────────────────────────────────
const PAGE_MAPS = {
  bakery:     ['Home','Menu','Gallery','About','Contact'],
  ecommerce:  ['Home','Shop','Products','About','Contact'],
  portfolio:  ['Home','Work','About','Contact'],
  college:    ['Home','Courses','About','Admissions','Contact'],
  birthday:   ['Home','Gallery','Wishes','About'],
  blog:       ['Home','Posts','About','Contact'],
  restaurant: ['Home','Menu','Gallery','About','Contact'],
  flower:     ['Home','Arrangements','Gallery','About','Contact'],
  landing:    ['Home','Features','Pricing','About','Contact'],
  wellness:   ['Home','Services','Gallery','About','Contact'],
  business:   ['Home','Services','About','Testimonials','Contact'],
};

// ─── Smart Name Extraction ─────────────────────────────────────────────────────
function extractName(prompt) {
  // "called X", "named X", "for X" patterns
  const patterns = [
    /called\s+["']?([A-Z][^"',.\n]{2,30})["']?/i,
    /named\s+["']?([A-Z][^"',.\n]{2,30})["']?/i,
    /^["']?([A-Z][a-zA-Z &'-]{2,28})["']?\s*[–—-]/,
    /for\s+["']?([A-Z][a-zA-Z &'-]{2,28})["']?\b/i,
  ];
  for (const rx of patterns) {
    const m = prompt.match(rx);
    if (m) return m[1].trim();
  }
  // fallback: first capitalized word group
  const fallback = prompt.match(/([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+){0,3})/);
  return fallback ? fallback[1] : 'My Website';
}

function extractTagline(prompt, type, name) {
  const lower = prompt.toLowerCase();
  const taglines = {
    bakery:     `Fresh baked with love every morning`,
    ecommerce:  `Shop the finest, delivered to you`,
    portfolio:  `Crafting stories through creative work`,
    college:    `Building tomorrow's leaders today`,
    birthday:   `Celebrating a special milestone 🎉`,
    blog:       `Thoughts, stories, and ideas`,
    restaurant: `Good food, good mood`,
    flower:     `Where every petal tells a story`,
    landing:    `The smarter way to get things done`,
    wellness:   `Nurture your mind, body, and soul`,
    business:   `Trusted by people who value quality`,
  };
  return taglines[type] || `Welcome to ${name}`;
}

// ─── Product / Item Generators ─────────────────────────────────────────────────
const PRODUCTS = {
  bakery: [
    { name:'Classic Sourdough', price:'₹180', desc:'Slow-fermented, golden crust, chewy inside.' },
    { name:'Butter Croissant', price:'₹120', desc:'Flaky layers, pure butter, baked fresh daily.' },
    { name:'Chocolate Lava Cake', price:'₹220', desc:'Warm, gooey center with rich dark chocolate.' },
    { name:'Birthday Cake (1kg)', price:'₹850', desc:'Custom decorated for any occasion.' },
    { name:'Blueberry Muffin', price:'₹95', desc:'Bursting with fresh blueberries, soft crumb.' },
    { name:'Cinnamon Roll', price:'₹130', desc:'Glazed, pull-apart, with a warm spice filling.' },
  ],
  ecommerce: [
    { name:'Starter Kit', price:'₹999', desc:'Everything you need to get started.' },
    { name:'Premium Bundle', price:'₹2,499', desc:'Our most popular collection, curated.' },
    { name:'Signature Piece', price:'₹1,599', desc:'A timeless item, loved by thousands.' },
    { name:'Gift Set', price:'₹1,299', desc:'Beautifully packaged, perfect for gifting.' },
    { name:'Limited Edition', price:'₹3,499', desc:'Exclusive drop — limited stock only.' },
    { name:'Everyday Essential', price:'₹749', desc:'Quality that fits your daily routine.' },
  ],
  wellness: [
    { name:'Lavender Soy Candle', price:'₹599', desc:'Hand-poured, 40-hour burn, calming scent.' },
    { name:'Himalayan Bath Salts', price:'₹399', desc:'Mineral-rich, soothing evening ritual.' },
    { name:'Aromatherapy Diffuser', price:'₹1,299', desc:'Ultrasonic mist with 7 mood settings.' },
    { name:'Crystal Face Roller', price:'₹799', desc:'Rose quartz, cool-touch, de-puffing.' },
    { name:'Herbal Tea Blend', price:'₹349', desc:'Sleep-support blend, 20 biodegradable bags.' },
    { name:'Meditation Cushion', price:'₹999', desc:'Ergonomic, eco-cotton fill, washable cover.' },
  ],
  flower: [
    { name:'Wedding Bouquet', price:'₹2,500', desc:'Premium blooms, custom-arranged for your day.' },
    { name:'Event Centerpiece', price:'₹1,800', desc:'Statement arrangement for tables and venues.' },
    { name:'Monthly Subscription', price:'₹1,200/mo', desc:'Fresh seasonal flowers delivered weekly.' },
    { name:'Potted Plants', price:'₹450', desc:'Low-maintenance, lush, and long-lasting.' },
    { name:'Sympathy Wreath', price:'₹1,500', desc:'Thoughtful and dignified arrangement.' },
    { name:'Get Well Basket', price:'₹999', desc:'Cheerful blooms to brighten someone\'s day.' },
  ],
  restaurant: [
    { name:'House Special Thali', price:'₹320', desc:'Chef\'s daily selection with sides and dessert.' },
    { name:'Artisan Burger', price:'₹280', desc:'Brioche bun, smashed patty, house sauce.' },
    { name:'Seasonal Pasta', price:'₹350', desc:'Made fresh, tossed with market vegetables.' },
    { name:'Charcuterie Board', price:'₹480', desc:'Cured meats, aged cheese, seasonal fruits.' },
    { name:'Wood-Fired Pizza', price:'₹420', desc:'Thin crust, San Marzano tomatoes.' },
    { name:'Dessert Trio', price:'₹220', desc:'Three mini desserts, rotating menu.' },
  ],
};

function getProducts(type, prompt) {
  const base = PRODUCTS[type] || PRODUCTS.ecommerce;
  // Extract any prices mentioned in prompt and sprinkle them in
  const mentioned = [...prompt.matchAll(/₹\s*[\d,]+/g)].map(m=>m[0]);
  return base.map((p,i) => ({
    ...p,
    price: mentioned[i] || p.price
  }));
}

// ─── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = {
  bakery:    [
    { name:'Priya S.', text:'The sourdough here is unlike anything I\'ve tasted. My family orders every week!', stars:5 },
    { name:'Rahul M.', text:'They made our wedding cake exactly as imagined. Absolutely stunning and delicious.', stars:5 },
    { name:'Ananya K.', text:'Best croissants in the city. Worth every rupee, every single time.', stars:5 },
  ],
  business:  [
    { name:'Vikram T.', text:'Professional, responsive, and truly exceeds expectations. Highly recommend.', stars:5 },
    { name:'Nisha P.', text:'They understood our needs immediately. The results speak for themselves.', stars:5 },
    { name:'Arjun R.', text:'Working with this team was a pleasure from start to finish.', stars:5 },
  ],
  wellness:  [
    { name:'Meera L.', text:'The candles transformed my evening routine. I sleep so much better now.', stars:5 },
    { name:'Divya C.', text:'Beautifully packaged, incredible quality. My go-to self-care brand.', stars:5 },
    { name:'Sana W.', text:'The bath salts are genuinely the best I\'ve ever used. Will reorder!', stars:5 },
  ],
  default:   [
    { name:'Aisha R.', text:'Absolutely love this! It exceeded every expectation I had.', stars:5 },
    { name:'Kiran D.', text:'Such a wonderful experience from start to finish. Highly recommend.', stars:5 },
    { name:'Maya T.', text:'The quality speaks for itself. I keep coming back for more.', stars:5 },
  ],
};

function getTestimonials(type) {
  return TESTIMONIALS[type] || TESTIMONIALS.default;
}

// ─── About Content ─────────────────────────────────────────────────────────────
function buildAboutText(name, type, prompt) {
  const snippets = {
    bakery:     `${name} was born from a simple belief: everyone deserves bread that's made with time, care, and real ingredients. We wake before dawn, tend to our starters, and bake in small batches so every loaf leaves the oven at its absolute best.`,
    ecommerce:  `${name} started with one question: why is it so hard to find things that are both beautiful and made to last? We curate products that answer that question — every item selected with intention, every purchase backed by our promise.`,
    portfolio:  `I'm a visual storyteller who believes that great design should feel effortless. Every project I take on starts with listening — understanding what you need — and ends with work that speaks louder than words.`,
    college:    `${name} was founded on the idea that education should unlock potential, not just tick boxes. We bring together passionate educators, real-world practitioners, and a culture of curious, driven learners.`,
    birthday:   `This page is a little corner of the internet built just for celebrating you. Every photo, every message, every memory here is a reminder of how much you mean to the people around you.`,
    wellness:   `${name} was created to help you slow down. In a world that never stops, we make products designed to bring you back to yourself — through scent, texture, ritual, and care.`,
    flower:     `Every arrangement at ${name} is designed from scratch. We don't do cookie-cutter florals. We listen to your story, your colors, your mood — and then we build something that truly feels like you.`,
    business:   `${name} has been delivering results for clients who care about quality. We're a small, focused team that believes in doing fewer things and doing them brilliantly.`,
    default:    `${name} was built with a clear purpose: to bring something genuinely good to the people who find us. We take our craft seriously, we listen carefully, and we never cut corners.`,
  };
  return snippets[type] || snippets.default;
}

// ─── Section Builders ──────────────────────────────────────────────────────────
function imgCat(type) {
  return TYPE_TO_IMG_CATEGORY[type] || 'default';
}

function buildHeroSection(name, tagline, type, prompt, imageSource, uploadedImages, idx) {
  const img = imageSource === 'upload' && uploadedImages?.length
    ? uploadedImages[0]
    : imageSource !== 'none'
    ? seededPexelsUrl(imgCat(type), 0, 1200, 720)
    : createPlaceholderImage(name, tagline);

  return {
    id: uid(), type: 'hero',
    title: name,
    tagline: tagline,
    text: extractHeroText(prompt, type, name),
    buttonText: heroButtonLabel(type),
    secondaryButtonText: 'Learn more',
    image: img,
    logo: createLogoSvg(name, type),
    themeColor: (TYPE_PALETTES[type] || TYPE_PALETTES.business).primary
  };
}

function extractHeroText(prompt, type, name) {
  const hints = {
    bakery:     `Baked fresh every morning with love and the finest ingredients. Come visit us or order online.`,
    ecommerce:  `Discover our carefully curated collection. Free shipping on orders above ₹999.`,
    portfolio:  `Open to new projects. Let's build something beautiful together.`,
    college:    `Shaping the next generation of thinkers, creators, and leaders.`,
    birthday:   `You only turn this age once — let's make it unforgettable! 🎉`,
    wellness:   `Take a moment for yourself. You deserve it.`,
    flower:     `Fresh flowers for every occasion. Custom arrangements made with care.`,
    landing:    `Join thousands already using it. Start free, no credit card required.`,
    business:   `We deliver quality you can rely on, every single time.`,
    default:    `Discover what makes us different. We'd love to work with you.`,
  };
  return hints[type] || hints.default;
}

function heroButtonLabel(type) {
  const labels = {
    bakery: 'Order now', ecommerce: 'Shop now', portfolio: 'View work',
    college: 'Apply now', birthday: 'See wishes', blog: 'Read blog',
    flower: 'Shop flowers', landing: 'Get started', wellness: 'Shop now',
    restaurant: 'See menu', business: 'Get in touch'
  };
  return labels[type] || 'Explore now';
}

function buildFeaturesSection(name, type, prompt) {
  const features = {
    bakery:     [{icon:'🌾',title:'Artisan quality',text:'Every item is handcrafted in small batches using traditional methods.'},{icon:'🕐',title:'Baked fresh daily',text:'Our oven starts at 5am so your bread is always at its peak.'},{icon:'🌱',title:'Real ingredients',text:'No preservatives, no shortcuts — just flour, water, salt, and time.'}],
    ecommerce:  [{icon:'✓',title:'Curated selection',text:'Every product is tested and chosen for quality before it reaches you.'},{icon:'🚚',title:'Fast shipping',text:'Orders dispatched within 24 hours. Free on orders above ₹999.'},{icon:'💬',title:'Real support',text:'Real people answering your questions, 7 days a week.'}],
    portfolio:  [{icon:'💡',title:'Creative direction',text:'Every project starts with strategy, not just aesthetics.'},{icon:'⚡',title:'Fast turnaround',text:'I respect your deadlines and deliver work you\'re proud of.'},{icon:'🔄',title:'Unlimited revisions',text:'I don\'t stop until you\'re genuinely happy with the result.'}],
    college:    [{icon:'📚',title:'Expert faculty',text:'Learn from practitioners who\'ve worked in the industries they teach.'},{icon:'🏆',title:'Industry recognition',text:'Our certifications are valued by leading employers nationwide.'},{icon:'🤝',title:'Placement support',text:'Dedicated career services to help you land your first role.'}],
    birthday:   [{icon:'🎂',title:'Milestone celebrated',text:'This page is a tribute to everything you\'ve become.'},{icon:'📷',title:'Memories captured',text:'Every photo here is a moment worth keeping forever.'},{icon:'💌',title:'Messages with love',text:'Words from everyone who is grateful you exist.'}],
    wellness:   [{icon:'🌿',title:'Natural ingredients',text:'Every product is crafted from plants, not chemicals.'},{icon:'🤍',title:'Ethically made',text:'Sustainably sourced, cruelty-free, and small-batch.'},{icon:'✨',title:'Ritual-ready',text:'Designed to fit beautifully into your daily self-care practice.'}],
    business:   [{icon:'⭐',title:'Proven results',text:'Years of experience delivering outcomes clients actually care about.'},{icon:'🤝',title:'Client-first',text:'We listen first, then build exactly what you need.'},{icon:'🔒',title:'Reliable',text:'On time, on budget, and never cutting corners.'}],
    default:    [{icon:'✓',title:'Quality first',text:'We never compromise on the things that matter.'},{icon:'💬',title:'Great support',text:'Always here when you need us.'},{icon:'⚡',title:'Fast delivery',text:'Quick, reliable, and consistent every time.'}],
  };
  return {
    id: uid(), type: 'features',
    heading: `Why people love ${name}`,
    items: (features[type] || features.default)
  };
}

function buildProductsSection(name, type, prompt, imageSource, uploadedImages) {
  const products = getProducts(type, prompt);
  const cat = imgCat(type);
  return {
    id: uid(), type: 'products',
    heading: type === 'portfolio' ? 'Featured projects' : type === 'college' ? 'Popular courses' : 'Our products',
    products: products.map((p, i) => ({
      ...p,
      id: uid(),
      image: imageSource !== 'none'
        ? (imageSource === 'upload' && uploadedImages?.[i+1] ? uploadedImages[i+1] : seededPexelsUrl(cat, i+2, 600, 400))
        : createPlaceholderImage(p.name, p.desc)
    }))
  };
}

function buildGallerySection(name, type, prompt, imageSource, uploadedImages) {
  const cat = imgCat(type);
  const count = 6;
  const images = Array.from({ length: count }, (_, i) => {
    if (imageSource === 'upload' && uploadedImages?.[i]) return uploadedImages[i];
    if (imageSource !== 'none') return seededPexelsUrl(cat, i + 10, 700, 500);
    return createPlaceholderImage(`${name} ${i+1}`, type);
  });
  return {
    id: uid(), type: 'gallery',
    heading: `A look inside ${name}`,
    images
  };
}

function buildTestimonialsSection(type) {
  return {
    id: uid(), type: 'testimonials',
    heading: 'What people are saying',
    items: getTestimonials(type)
  };
}

function buildAboutSection(name, type, prompt) {
  return {
    id: uid(), type: 'about',
    heading: `About ${name}`,
    body: buildAboutText(name, type, prompt),
    image: seededPexelsUrl(imgCat(type), 20, 800, 600)
  };
}

function buildContactSection(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g,'-');
  return {
    id: uid(), type: 'contact',
    heading: `Get in touch`,
    email: `hello@${slug}.com`,
    phone: '+91 98765 43210',
    address: 'Your city, India',
    body: 'We\'d love to hear from you! Reach out via email, phone, or drop by in person.'
  };
}

function buildMenuSection(name, type, prompt, imageSource, uploadedImages) {
  const cat = imgCat(type);
  const items = getProducts(type, prompt).slice(0, 6).map((p, i) => ({
    ...p, id: uid(),
    image: imageSource !== 'none' ? seededPexelsUrl(cat, i+3, 500, 380) : createPlaceholderImage(p.name, '')
  }));
  return { id: uid(), type: 'products', heading: 'Our menu', products: items };
}

function buildCoursesSection(name) {
  const courses = [
    { name:'B.Tech Computer Science', price:'₹1.2L/yr', desc:'AI, ML, systems, and full-stack development.' },
    { name:'B.Des Interaction Design', price:'₹1.4L/yr', desc:'UX, visual design, and product thinking.' },
    { name:'BBA Business Management', price:'₹90K/yr', desc:'Marketing, finance, and entrepreneurship.' },
    { name:'Data Science Diploma', price:'₹60K/yr', desc:'Python, statistics, and real-world analytics.' },
  ];
  return { id: uid(), type: 'products', heading: 'Our programmes', products: courses.map(c => ({...c, id:uid(), image:seededPexelsUrl('college',Math.random()*8|0,500,380)})) };
}

function buildBlogPostsSection() {
  const posts = [
    { name:'How I got started', price:'5 min read', desc:'The story behind why I started writing and what keeps me going.' },
    { name:'Tools I swear by', price:'4 min read', desc:'My favourite apps, gear, and habits that make work enjoyable.' },
    { name:'Lessons from failure', price:'7 min read', desc:'Three things I got wrong, and what I learned from each one.' },
  ];
  return { id: uid(), type: 'products', heading: 'Latest posts', products: posts.map(p=>({...p,id:uid(),image:seededPexelsUrl('blog',Math.random()*8|0,500,380)})) };
}

function buildWishesSection() {
  return {
    id: uid(), type: 'cards',
    heading: '💌 Messages from loved ones',
    cards: [
      { title:'From Mom & Dad', text:'Watching you grow has been the greatest joy of our lives. Happy Birthday, my love! 🌸' },
      { title:'From your best friend', text:'You make every room brighter. Here\'s to another year of adventures together! 🥂' },
      { title:'From the whole crew', text:'You deserve every good thing coming your way. We love you so much! 🎉' },
    ]
  };
}

function buildPricingSection() {
  return {
    id: uid(), type: 'cards',
    heading: 'Simple, transparent pricing',
    cards: [
      { title:'Starter — Free', text:'Perfect for individuals. Core features, 1 project, community support.' },
      { title:'Pro — ₹499/mo', text:'For growing teams. Unlimited projects, priority support, advanced analytics.' },
      { title:'Enterprise — Custom', text:'For organisations. Custom integrations, dedicated onboarding, SLA.' },
    ]
  };
}

// ─── Page Builder ──────────────────────────────────────────────────────────────
function buildSections(pageName, name, type, prompt, imageSource, uploadedImages) {
  const isHome = pageName === 'Home';
  if (isHome) {
    const sections = [
      buildHeroSection(name, extractTagline(prompt, type, name), type, prompt, imageSource, uploadedImages, 0),
      buildFeaturesSection(name, type, prompt),
    ];
    if (!['portfolio','blog','birthday'].includes(type)) {
      sections.push(buildProductsSection(name, type, prompt, imageSource, uploadedImages));
    }
    if (type === 'blog') sections.push(buildBlogPostsSection());
    if (type === 'birthday') sections.push(buildWishesSection());
    sections.push(buildGallerySection(name, type, prompt, imageSource, uploadedImages));
    sections.push(buildTestimonialsSection(type));
    return sections;
  }

  if (['Menu','Products','Shop'].includes(pageName)) return [buildMenuSection(name, type, prompt, imageSource, uploadedImages)];
  if (pageName === 'Courses') return [buildCoursesSection(name)];
  if (['Gallery','Photos'].includes(pageName)) return [buildGallerySection(name, type, prompt, imageSource, uploadedImages)];
  if (['About','Story'].includes(pageName)) return [buildAboutSection(name, type, prompt)];
  if (['Testimonials','Reviews'].includes(pageName)) return [buildTestimonialsSection(type)];
  if (pageName === 'Features') return [buildFeaturesSection(name, type, prompt)];
  if (pageName === 'Pricing') return [buildPricingSection()];
  if (pageName === 'Posts') return [buildBlogPostsSection()];
  if (pageName === 'Wishes') return [buildWishesSection()];
  if (['Arrangements','Services','Work'].includes(pageName)) return [buildProductsSection(name, type, prompt, imageSource, uploadedImages)];
  if (pageName === 'Admissions') return [{
    id: uid(), type: 'cards', heading: 'How to apply',
    cards: [
      { title:'Step 1 — Apply online', text:'Fill in the application form. Takes under 10 minutes.' },
      { title:'Step 2 — Entrance test', text:'Appear for our entrance test or submit your mark sheet.' },
      { title:'Step 3 — Interview', text:'A short conversation to understand your goals and interests.' },
      { title:'Step 4 — Confirmation', text:'Receive your offer letter and complete enrollment.' },
    ]
  }];
  if (pageName === 'Contact') return [buildContactSection(name)];

  // Fallback
  return [{ id: uid(), type: 'text', heading: pageName, body: `Content for the ${pageName} page of ${name}.` }];
}

function slugify(v='') { return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

// ─── Main Export ───────────────────────────────────────────────────────────────
export function generateFromPrompt(prompt, options = {}) {
  const { imageSource = 'unsplash', uploadedImages = [], vibes = [], colorMode = 'ai', customColor = null } = options;
  
  const type     = detectWebsiteType(prompt);
  const name     = extractName(prompt);
  const pageNames = PAGE_MAPS[type] || PAGE_MAPS.business;
  const palette   = colorMode === 'custom' && customColor
    ? { ...(TYPE_PALETTES[type] || TYPE_PALETTES.business), primary: customColor }
    : (TYPE_PALETTES[type] || TYPE_PALETTES.business);

  // Smarter layout selection — different every generation
  const layoutVariant = inferLayoutVariant(type, prompt, pageNames);

  const pages = pageNames.map(pageName => ({
    id: uid(),
    name: pageName,
    slug: pageName === 'Home' ? 'index' : slugify(pageName),
    sections: buildSections(pageName, name, type, prompt, imageSource, uploadedImages)
  }));

  return {
    id: uid(),
    title: name,
    type,
    prompt,
    theme: { ...palette, vibes, layoutVariant },
    pages,
    prompts: { imageDirection: imgCat(type), extra: '' }
  };
}

// Keep backward compat for preview.js createBlankSection / createPlaceholderImage
export function createPlaceholderImage(title, subtitle) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#eef8ef"/><stop offset="1" stop-color="#f7f4ea"/></linearGradient></defs><rect width="1200" height="800" rx="38" fill="url(#g)"/><circle cx="240" cy="180" r="120" fill="#d8edd8"/><circle cx="980" cy="620" r="150" fill="#f4ddcc"/><rect x="140" y="140" width="920" height="520" rx="32" fill="#fff" opacity=".88"/><text x="600" y="360" text-anchor="middle" font-family="Inter,Arial" font-size="52" font-weight="700" fill="#2b4037">${String(title||'').replace(/[<>&'"]/g,m=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[m]))}</text><text x="600" y="430" text-anchor="middle" font-family="Inter,Arial" font-size="28" fill="#5f7c6a">${String(subtitle||'').replace(/[<>&'"]/g,m=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[m]))}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createLogoSvg(title, type) {
  const initials = (title||'SB').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  const colors = { bakery:'#d4896a', ecommerce:'#7a9ecb', portfolio:'#6b7280', college:'#5b84b1', birthday:'#e07caa', wellness:'#7dbfa6', flower:'#c47fa8', business:'#5b8a6b', default:'#88b79a' };
  const c = colors[type] || colors.default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280"><rect width="280" height="280" rx="72" fill="${c}"/><circle cx="140" cy="140" r="88" fill="#fff" opacity=".15"/><text x="140" y="166" text-anchor="middle" font-family="Inter,Arial" font-size="96" font-weight="800" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function generateImageSet(type, seed, count=3) {
  const cat = TYPE_TO_IMG_CATEGORY[type?.toLowerCase()] || 'default';
  return Array.from({length:count}, (_,i) => seededPexelsUrl(cat, i, 700, 500));
}

export function createBlankSection(kind='text') {
  if (kind==='gallery') return {id:uid(),type:'gallery',heading:'New gallery',images:generateImageSet('default','new',3)};
  if (kind==='cards') return {id:uid(),type:'cards',heading:'New section',cards:[{title:'Card one',text:'Write something here.'},{title:'Card two',text:'Write something here.'}]};
  return {id:uid(),type:'text',heading:'New section',body:'Click here and edit this text.'};
}

// Legacy: keep generateProjectData for any old code paths
export function generateProjectData(input) {
  const prompt = input.anythingElse
    ? `${input.websiteType} website called ${input.websiteName}. ${input.description}. For ${input.targetAudience}. ${input.anythingElse}`
    : `${input.websiteType} website called ${input.websiteName}. ${input.description}. For ${input.targetAudience}.`;
  return generateFromPrompt(prompt, {
    imageSource: input.imageOption?.toLowerCase().includes('upload') ? 'upload' : 'unsplash',
    vibes: input.vibes || [],
    colorMode: input.colorMode || 'ai',
    customColor: input.customColor
  });
}

async function fetchSmartImages(query, count = 1) {
  try {
    const res = await fetch(`/api/images?q=${encodeURIComponent(query)}&count=${count}`);
    const data = await res.json();
    return Array.isArray(data.images) ? data.images : [];
  } catch {
    return [];
  }
}

function normalizePalette(input = {}, fallbackType = 'business', options = {}) {
  const fallback = TYPE_PALETTES[fallbackType] || TYPE_PALETTES.business;
  const palette = {
    primary: input.primary || fallback.primary,
    bg: input.bg || '#f7f5f2',
    surface: input.surface || '#fffdf9',
    accent: input.accent || '#e7f1ea',
    text: input.text || '#23352e',
  };
  if (options.colorMode === 'custom' && options.customColor) palette.primary = options.customColor;
  return palette;
}

function inferType(type = 'business') {
  const normalized = String(type || 'business').toLowerCase();
  if (normalized.includes('anniversary')) return 'birthday';
  if (normalized.includes('creative')) return 'portfolio';
  return TYPE_PALETTES[normalized] ? normalized : 'business';
}

function sectionText(section, keys) {
  for (const key of keys) {
    if (section[key]) return section[key];
  }
  return '';
}

async function mapSection(section, type, title, options = {}) {
  const normalizedType = inferType(type);
  const imageSource = options.imageSource || 'pexels';
  const uploadedImages = options.uploadedImages || [];
  const fallbackImages = generateImageSet(normalizedType, title, 4);
  const getOneImage = async (query, index = 0) => {
    if (imageSource === 'upload' && uploadedImages[index]) return uploadedImages[index];
    const fetched = imageSource !== 'none' ? await fetchSmartImages(query, 1) : [];
    return fetched[0] || fallbackImages[index % fallbackImages.length] || createPlaceholderImage(title, query);
  };
  const getManyImages = async (queries = [], count = 3) => {
    if (imageSource === 'upload' && uploadedImages.length) return uploadedImages.slice(0, count);
    const combined = [];
    for (const q of queries.slice(0, count)) {
      const fetched = imageSource !== 'none' ? await fetchSmartImages(q, 1) : [];
      if (fetched[0]) combined.push(fetched[0]);
    }
    while (combined.length < count) combined.push(fallbackImages[combined.length % fallbackImages.length] || createPlaceholderImage(title, 'gallery'));
    return combined;
  };

  switch (section.type) {
    case 'hero': {
      return {
        id: uid(),
        type: 'hero',
        title: section.title || title,
        tagline: section.tagline || '',
        text: section.text || section.body || '',
        buttonText: section.buttonText || 'Get started',
        secondaryButtonText: section.secondaryButtonText || 'Explore more',
        image: await getOneImage(section.imageQuery || `${normalizedType} luxury hero`),
        logo: createLogoSvg(title, normalizedType),
      };
    }
    case 'features': {
      const items = Array.isArray(section.items) ? section.items : [];
      return {
        id: uid(),
        type: 'features',
        heading: section.heading || 'Why choose us',
        items: items.slice(0, 6).map((item, i) => ({
          icon: item.icon || ['✦', '◌', '✷', '◆', '✺', '❋'][i % 6],
          title: item.title || `Feature ${i + 1}`,
          text: item.text || 'Add your feature description here.',
        })),
      };
    }
    case 'products': {
      const products = Array.isArray(section.products) ? section.products : [];
      const mapped = [];
      for (let i = 0; i < products.slice(0, 8).length; i++) {
        const prod = products[i];
        mapped.push({
          id: uid(),
          name: prod.name || `Item ${i + 1}`,
          price: prod.price || '₹999',
          desc: prod.desc || 'Premium item description.',
          image: await getOneImage(prod.imageQuery || `${normalizedType} ${prod.name || 'product'} luxury`, i),
        });
      }
      return { id: uid(), type: 'products', heading: section.heading || 'Featured collection', products: mapped };
    }
    case 'gallery': {
      const queries = Array.isArray(section.images) ? section.images : [section.imageQuery || `${normalizedType} editorial photography`, `${normalizedType} premium interior`, `${normalizedType} lifestyle details`];
      return { id: uid(), type: 'gallery', heading: section.heading || 'Gallery', images: await getManyImages(queries, 4) };
    }
    case 'testimonials': {
      const items = Array.isArray(section.items) ? section.items : [];
      return {
        id: uid(),
        type: 'testimonials',
        heading: section.heading || 'Loved by clients',
        items: items.slice(0, 4).map((item, i) => ({
          name: item.name || `Client ${i + 1}`,
          text: item.text || 'Beautiful quality and a seamless experience.',
          stars: item.stars || 5,
        })),
      };
    }
    case 'about': {
      return {
        id: uid(),
        type: 'about',
        heading: section.heading || 'About',
        body: sectionText(section, ['body', 'text']) || 'Add your story here.',
        image: await getOneImage(section.imageQuery || `${normalizedType} about brand portrait`),
      };
    }
    case 'contact': {
      return {
        id: uid(),
        type: 'contact',
        heading: section.heading || 'Contact',
        body: section.body || section.text || 'Reach out to start a conversation.',
        email: section.email || 'hello@example.com',
        phone: section.phone || '+91 98765 43210',
        address: section.address || 'Your city, India',
      };
    }
    case 'cards': {
      return {
        id: uid(),
        type: 'cards',
        heading: section.heading || 'Highlights',
        cards: (section.cards || []).slice(0, 6).map((card, i) => ({
          title: card.title || `Card ${i + 1}`,
          text: card.text || 'Add some detail here.',
        })),
      };
    }
    default:
      return {
        id: uid(),
        type: 'text',
        heading: section.heading || section.title || 'Section',
        body: sectionText(section, ['body', 'text']) || 'Edit this section in preview.',
      };
  }
}


function inferLayoutVariant(type, prompt = '', pages = []) {
  const source = `${type} ${prompt} ${pages.map(p => p.name || p || '').join(' ')}`.toLowerCase();

  // Keyword-specific overrides first
  if (/(luxury|premium|editorial|perfume|jewelry|fashion|haute)/.test(source)) return 'editorial';
  if (/(cute|birthday|anniversary|gift|romantic|celebration|party)/.test(source)) return 'storybook';
  if (/(saas|startup|app|ad|landing|launch|waitlist)/.test(source)) return 'immersive';
  if (/(bakery|restaurant|food|store|shop|ecommerce|market)/.test(source)) return 'catalog';
  if (/(portfolio|designer|photographer|artist|creative|illustrator)/.test(source)) return 'showcase';
  if (/(blog|journal|editorial|magazine|newsletter|writer)/.test(source)) return 'editorial';
  if (/(wellness|yoga|spa|fitness|health|meditat|mindful)/.test(source)) return 'sanctuary';
  if (/(college|university|academy|school|institute|education)/.test(source)) return 'institutional';

  // For generic prompts: rotate across all layouts using a seed derived from prompt content
  const VARIANTS = ['editorial', 'showcase', 'immersive', 'catalog', 'signature', 'storybook', 'sanctuary'];
  const seed = (source.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + Date.now()) % VARIANTS.length;
  return VARIANTS[seed];
}

export function getLayoutTheme(project) {
  return project?.theme?.layoutVariant || inferLayoutVariant(project?.type || 'business', project?.prompt || '', project?.pages || []);
}

export function createRealtimeImageUrl(query, index = 0) {
  const seed = Date.now() + index * 31 + Math.floor(Math.random() * 10000);
  return `/api/images?q=${encodeURIComponent(query || 'luxury editorial scene')}&count=8&seed=${seed}`;
}

export async function convertAiProjectToBuilderFormat(aiProject, options = {}) {
  const rawType = aiProject.websiteType || options.analysis?.websiteType || 'business';
  const type = inferType(rawType);
  const title = aiProject.title || options.answers?.websiteName || options.analysis?.websiteName || extractName(options.prompt || 'My Website');
  const palette = normalizePalette(aiProject.palette, type, options);
  const vibes = Array.isArray(aiProject.vibes) ? aiProject.vibes : (options.vibes || ['luxury', 'soft', 'premium']);
  const layoutVariant = aiProject.layoutVariant || inferLayoutVariant(type, options.prompt || title, aiProject.pages || []);
  const pages = [];

  for (const page of (aiProject.pages || [])) {
    const sections = [];
    for (const section of (page.sections || [])) {
      sections.push(await mapSection(section, type, title, options));
    }
    pages.push({
      id: uid(),
      name: page.name || 'Home',
      slug: page.slug || (page.name === 'Home' ? 'index' : slugify(page.name || 'page')),
      sections,
    });
  }

  if (!pages.length) return generateFromPrompt(options.prompt || title, options);

  return {
    id: uid(),
    title,
    type,
    prompt: options.prompt || title,
    theme: { ...palette, vibes, layoutVariant },
    pages,
    prompts: {
      imageDirection: (aiProject.imageKeywords || options.analysis?.imageKeywords || []).join(', '),
      extra: aiProject.tagline || '',
    },
  };
}
