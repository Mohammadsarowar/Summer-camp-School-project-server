const  express  = require("express");
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.SECRET_KEY);
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
    })
  }

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb://${process.env.USER_NAME}:${process.env.USER_PASS}@ac-o6iroya-shard-00-00.wymoxsw.mongodb.net:27017,ac-o6iroya-shard-00-01.wymoxsw.mongodb.net:27017,ac-o6iroya-shard-00-02.wymoxsw.mongodb.net:27017/?ssl=true&replicaSet=atlas-puyajh-shard-0&authSource=admin&retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
     await client.connect();
    const userCollection = client.db("Summer-school-data").collection("user");
    const classCollection = client.db("Summer-school-data").collection("students");
    const InstructorCollection = client.db("Summer-school-data").collection("Instructors");
    const paymentCollection = client.db("Summer-school-data").collection("payments")
    // Connect the client to the server	(optional starting in v4.7)
   
    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        res.send({ token })
      })

      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email }
        const user = await userCollection.findOne(query);
        if (user?.role !== 'admin') {
          return res.status(403).send({ error: true, message: 'forbidden message' });
        }
        next();
      }
      // 
      app.get('/carts',verifyJWT, async (req, res) => {
        const email = req.query.email;
  
        if (!email) {
          res.send([]);
        }
  
        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
          return res.status(403).send({ error: true, message: 'forbidden access' })
        }
  
        const query = { email: email };
        const result = await classCollection.find(query).toArray();
        res.send(result);
      });
    app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
       
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'admin'
          },
        };
  
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
  
      })
    app.patch('/users/Instructors/:id', async (req, res) => {
        const id = req.params.id;
       
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            Instructors: 'Instructors'
          },
        };
  
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
  
      })
      //admin 
      app.get('/users/admin/:email',verifyJWT,  async (req, res) => {
        const email = req.params.email;
  
        if (req.decoded.email !== email) {
          res.send({ admin: false })
        }
  
        const query = { email: email }
        const user = await userCollection.findOne(query);
        const result = { admin: user?.role === 'admin' }
        res.send(result);
      })
      //InstructorName 
      app.get('/users/Instructors/:email',verifyJWT,  async (req, res) => {
        const email = req.params.email;
  
        if (req.decoded.email !== email) {
          res.send({ Instructors: false })
        }
  
        const query = { email: email }
        const user = await userCollection.findOne(query);
        const result = { Instructors: user?.Instructors === 'Instructors' }
        res.send(result);
      })
//
      app.post('/create-payment-intent',verifyJWT,  async (req, res) => {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        });
  
        res.send({
          clientSecret: paymentIntent.client_secret
        })
      })
  
      app.post('/payments', verifyJWT, async (req, res) => {
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment);
  
        const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
        const deleteResult = await classCollection.deleteMany(query)
  
        res.send({ insertResult, deleteResult });
      })

      app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {
        const users = await userCollection.estimatedDocumentCount();
        const products = await classCollection.estimatedDocumentCount();
        const orders = await paymentCollection.estimatedDocumentCount();
  
        // best way to get sum of the price field is to use group and sum operator
        /*
          await paymentCollection.aggregate([
            {
              $group: {
                _id: null,
                total: { $sum: '$price' }
              }
            }
          ]).toArray()
        */
  
        const payments = await paymentCollection.find().toArray();
        const revenue = payments.reduce( ( sum, payment) => sum + payment.price, 0)
  
        res.send({
          revenue,
          users,
          products,
          orders
        })
      })
    app.get('/users', async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      });
      app.post('/class', async (req, res) => {
        const newItem = req.body;
        const result = await classCollection.insertOne(newItem)
        res.send(result);
      })
    app.post('/users',async(req,res)=>{
         const user = req.body;
         const query = {email: user.email}
         const existingUser = await userCollection.findOne(query)
         if(existingUser){
           return res.send({message:'user already exists'}) 
         }
         const result = await userCollection.insertOne(user)
         res.send(result)
    })
    app.delete('/user/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await userCollection.deleteOne(query);
        res.send(result);
      })
    

    app.get('/class',async(req,res)=>{
        const cursor = await classCollection.find().toArray();
        res.send(cursor)
    })
    app.get('/Instructor',async(req,res)=>{
        const cursor = await InstructorCollection.find().toArray();
        res.send(cursor)
    })
    app.get('/order-stats', verifyJWT, verifyAdmin, async(req, res) =>{
      const pipeline = [
        {
          $lookup: {
            from: 'menu',
            localField: 'menuItems',
            foreignField: '_id',
            as: 'menuItemsData'
          }
        },
        {
          $unwind: '$menuItemsData'
        },
        {
          $group: {
            _id: '$menuItemsData.category',
            count: { $sum: 1 },
            total: { $sum: '$menuItemsData.price' }
          }
        },
        {
          $project: {
            category: '$_id',
            count: 1,
            total: { $round: ['$total', 2] },
            _id: 0
          }
        }
      ];

      const result = await paymentCollection.aggregate(pipeline).toArray()
      res.send(result)

    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('server is sitting')
})
//try to come powend
app.listen(port,()=>{
    console.log(`summer-camp-school-server${port}`);
})