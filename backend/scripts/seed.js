// Simple seed script to create demo users and image posts
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Tweet = require('../models/Tweet');

async function run(){
  await connectDB(process.env.MONGO_URI);
  console.log('Seeding...');
  await User.deleteMany({});
  await Tweet.deleteMany({});

  const u1 = await User.create({ name: 'Demo User', email: 'demo@local', password: 'nopass' });
  const u2 = await User.create({ name: 'Alice', email: 'alice@local', password: 'nopass' });

  const imgs = [
    'https://picsum.photos/seed/p1/800/450',
    'https://picsum.photos/seed/p2/800/450',
    'https://picsum.photos/seed/p3/800/450'
  ];

  await Tweet.create({ user: u1._id, text: 'Hello from demo #React', mediaUrls: [imgs[0]] });
  await Tweet.create({ user: u2._id, text: 'Another post #AI #React', mediaUrls: [imgs[1]] });
  console.log('Done');
  process.exit(0);
}

run().catch(e=>{console.error(e); process.exit(1);});
