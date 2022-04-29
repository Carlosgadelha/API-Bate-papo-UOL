import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";
dotenv.config();


const app = express();
app.use(express.json());
app.use(cors());


const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

app.post('/participants', async (req, res) => {
    try {
        const {name} = req.body;
    
		if (!name) {
			await mongoClient.connect();
			const db = mongoClient.db("BatepapoUol");

			db.collection("participants").insertOne({
				name: req.body.name, 
				lastStatus: Date.now()
			});
			res.statusCode(201);
			mongoClient.close();
		}
				
	 } catch (error) {
	  res.status(500).send('A culpa foi do estagiário')
	
	 }

})

app.get('/participants', async (req, res) => {

    try {

		await mongoClient.connect();
		const db = mongoClient.db("BatepapoUol");
        
        const participants = await db.collection("participants").find().toArray()
				
		res.send(participants);
		mongoClient.close();
	 } catch (error) {
	  res.status(500).send('A culpa foi do estagiário').send(error)
		mongoClient.close()
	 }

})



app.listen(5000, () => {
    console.log(chalk.bold.green("Server is running on port 5000"));
});