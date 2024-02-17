import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = "mongodb+srv://amexo684:Ronaldovs10!@cluster0.tp6rblq.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectTodb() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    return client; // Return the client instance
  } catch (error) {
    // Handle errors that occur during connection
    console.error("Failed to connect to MongoDB:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

export default connectTodb;
