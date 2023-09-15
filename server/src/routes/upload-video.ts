import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import path from "node:path";
import fs from "fs";
import { pipeline } from "node:stream";
import { randomUUID} from "node:crypto"
import { fastifyMultipart } from "@fastify/multipart";
import { promisify } from "node:util";


const pump = promisify(pipeline);
export async function uploadVideoRoute(app: FastifyInstance) {
  

  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 80
    }
  })
  app.post('/videos', async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Missing file input." });
    
    const extension = path.extname(data.filename)
    if (extension !== '.mp3') return reply.status(400).send({ error: "Invalid input type, please upload a MP3." });
    const filebaseName = path.basename(data.filename, extension);
    const fileUploadName = `${filebaseName}-${randomUUID()}${extension}`;
    const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName);
    await pump(data.file, fs.createWriteStream(uploadDestination));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination
      }
    });

  return { video }

  // return reply.status(200).send({message:"Upload realizado com sucesso!"});
})
}