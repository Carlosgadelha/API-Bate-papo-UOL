import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { MongoClient, ObjectId } from 'mongodb';
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
		messages.sort(() => {time: 1})

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

    try{
		const participant = await dataBase.collection("participants").findOne({name: user})

		await dataBase.collection("participants").updateOne( {name: user} , { $set:{lastStatus}} )

		if (!participant) {
			res.sendStatus(404)
			return;
		}
		console.log('lastStatus: ', lastStatus);
		res.sendStatus(200);
	}catch(error){
		console.log(error)
	}

})

app.delete('/messages/:id', async (req, res) => {
	const { user } = req.headers;
	const id = req.params.id;
	console.log(req.params.id)

	try{
		const message = await dataBase.collection("messages").findOne({_id: new ObjectId(id)})
		await dataBase.collection("messages").deleteOne({ _id: new ObjectId(id) } )
        console.log(message)
        if (message.from !== user) {
			res.sendStatus(401)
			return;
		}
		if (!message) {
			res.sendStatus(404)
			return;
		}
	}catch(error){
		console.log(error)
	};
	
})

app.put("/messages/:id", async (req, res) => {

	const { user } = req.headers;
	const id = req.params.id;

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

	try{
		const message = await dataBase.collection("messages").findOne({_id: new ObjectId(id)})
		await dataBase.collection("messages").updateOne( { _id: new ObjectId(id) }  , 
		{ $set: req.body} )
	
        if (message.from !== user) {
			res.sendStatus(401)
			return;
		}
		if (!message) {
			res.sendStatus(404)
			return;
		}
	}catch(error){
		console.log(error)
	};

})


setInterval(async () => {

	const horaAtual = Date.now();
    try {
		const participants = await dataBase.collection("participants").find().toArray();
		const isRemoved = participants.filter(element => {
			if(horaAtual - element.lastStatus > 10000) return element
		})

		isRemoved.forEach( async participant => { 
			await dataBase.collection("participants").deleteOne({ _id: new ObjectId(participant._id) });
			await dataBase.collection("messages").insertOne({

				from: participant.name, 
				to: 'Todos', 
				text:'sai da sala...', 
				type: 'status', 
				time: dayjs(horaAtual).format('HH:mm:ss')

			});
		});
	} catch (error) {
		console.log(error)
	}
	


} , 15000);

app.listen(5000, () => {
    console.log(chalk.bold.green("Server is running on port 5000"));
});