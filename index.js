const  express  = require("express");
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

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
const uri = "mongodb://summerSchool:F343APTm2gbZmfKR@ac-o6iroya-shard-00-00.wymoxsw.mongodb.net:27017,ac-o6iroya-shard-00-01.wymoxsw.mongodb.net:27017,ac-o6iroya-shard-00-02.wymoxsw.mongodb.net:27017/?ssl=true&replicaSet=atlas-puyajh-shard-0&authSource=admin&retryWrites=true&w=majority";

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
    // Connect the client to the server	(optional starting in v4.7)
   
    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        res.send({ token })
      })
    //   app.get('/carts', verifyJWT, async (req, res) => {
    //     const email = req.query.email;
  
    //     if (!email) {
    //       res.send([]);
    //     }
  
    //     const decodedEmail = req.decoded.email;
    //     if (email !== decodedEmail) {
    //       return res.status(403).send({ error: true, message: 'forbidden access' })
    //     }
  
    //     const query = { email: email };
    //     const result = await InstructorCollection.find(query).toArray();
    //     res.send(result);
    //   });
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
            pud: 'Instructors'
          },
        };
  
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
  
      })
  
    app.get('/users', async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      });
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

app.listen(port,()=>{
    console.log(`summer-camp-school-server${port}`);
})