import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import dotenv from "dotenv";
import { prisma } from './lib/prisma';
import { getAllPromptsRoute } from './routes/get-all-prompts';
import { uploadVideoRoute } from './routes/upload-video';
import { createTranscriptionRoute } from './routes/create-transcription';
import { createAICompletionRoute } from './routes/generate-ai-completion';


dotenv.config();

const app = fastify();
app.register(fastifyCors, {
  origin: '*',
})
const PORT = Number(process.env.PORT) || 3333;




app.get('/', () => { return 'Server is Online' });

app.register(getAllPromptsRoute);
app.register(uploadVideoRoute);
app.register(createTranscriptionRoute);
app.register(createAICompletionRoute);


app.listen({ port: PORT }).then(() => { console.log('HTTP Server Running!')})