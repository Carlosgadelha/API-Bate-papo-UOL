import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";
import dayjs from 'dayjs';
import joi from 'joi'

dotenv.config();


const app = express();
app.use(express.json());
app.use(cors());

let dataBase = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);
await mongoClient.connect()
	.then(() => {
		dataBase = mongoClient.db("BatepapoUol");
		console.log(chalk.bold.green("connect success"));
	})
	.catch(() => {console.log(chalk.bold.red("connect failed"))})

app.post('/participants', async (req, res) => {
	
	const name = req.body.name;
	const lastStatus = Date.now();
	const time = dayjs(lastStatus).format('HH:mm:ss');

	const userSchema = joi.object({
		name: joi.string().required()
	});
	
	const validacao = userSchema.validate(req.body);
	if(validacao.error) {
		res.status(422).send(validacao.error.details);
		return;
	}

	const participants = await dataBase.collection("participants").find().toArray();
    const isParticipant = participants.filter(element => {
		if(element.name === req.body.name) return element
	})

	if(isParticipant.length > 0) {
		res.status(409).send('usuario não disponivel: ' + req.body.name);
		return;
	};

    try {

		console.log("dados recebidos", name)
		await dataBase.collection("participants").insertOne({
			name, 
			lastStatus
		});

		await dataBase.collection("messages").insertOne({

			from: name, 
			to: 'Todos', 
			text:'entra na sala...', 
			type: 'status', 
			time

		});
		
		
		console.log('user: ' + name);
		res.sendStatus(201);

				
	} catch (error) {
        console.log(error)
	  	res.status(500).send('A culpa foi do estagiário')
	
	}

})

app.get('/participants', async (req, res) => {

    try {
     
        const participants = await dataBase.collection("participants").find().toArray()
		res.send(participants);
		
	 } catch (error) {
	  res.status(500).send('A culpa foi do estagiário')
	 }

})

app.post('/messages', async (req, res) => {

	const { to, text, type }= req.body;
	const { user } = req.headers;
	const lastStatus = Date.now();
	const time = dayjs(lastStatus).format('HH:mm:ss');

	const messageSchema = joi.object({
		to: joi.string().min(1).required(),
		text: joi.string().min(1).required(),
		type: joi.string().valid("message", "private_message").required()
	});
	
	const validacao = messageSchema.validate(req.body);
	if(validacao.error) {
		res.status(422).send(validacao.error.details);
		return;
	}

	const participants = await dataBase.collection("participants").find().toArray();
    const isParticipant = participants.filter(element => {
		if(element.name === req.body.name) return element
	})

	if(isParticipant.length < 0) {
		res.status(422);
		return;
	};
	
	try {
		
		await dataBase.collection("messages").insertOne({

			from: user, 
			to: to, 
			text: text, 
			type: type, 
			time

		});
		res.sendStatus(201);
	
				
	 } catch (error) {
	  console.log(error);
	  res.status(500).send('A culpa foi do estagiário')
	
	 }
})

app.get('/messages', async (req, res) => {
   
	const limit = parseInt(req.query.limit);
	const user = req.headers.user;
	let messagesFiltradas = []; 
    try {

        const messages = await dataBase.collection("messages").find().toArray()
	    messages.reverse()
		messagesFiltradas = messages.filter(element => {
			if(element.to === "Todos" || element.to === user || element.from === user) return element
		});
		
		isNaN(limit) ? res.send(messagesFiltradas) :  res.send(messagesFiltradas.slice(0, limit)) ;
		
	 } catch (error) {
	  console.log(error);
	  res.status(500).send('A culpa foi do estagiário')
	 }

})

app.post('/status', async (req, res) => {
	const { user } = req.headers;
	const lastStatus = Date.now();
	console.log(user);
    try{
		const participant = await dataBase.collection("participants").findOne({name: user})
		
		await dataBase.collection("participants").updateOne({ 
			_id: participant._id 
		}, { $set:{lastStatus}} )

		if (!participant) {
			res.sendStatus(404)
			return;
		}
		res.sendStatus(200);
	}catch(error){
		console.log(error)
	}

})

app.listen(5000, () => {
    console.log(chalk.bold.green("Server is running on port 5000"));
});