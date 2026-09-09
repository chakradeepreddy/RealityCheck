import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function attachmentRoutes(app: FastifyInstance) {
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Validate MIME type
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.code(400).send({ error: 'Invalid file type. Only PNG, JPEG, and WEBP are allowed.' });
      }

      // Ensure directory exists
      const evidenceDir = path.join(process.cwd(), 'data', 'evidence');
      await fs.mkdir(evidenceDir, { recursive: true });

      // Generate secure filename
      const ext = path.extname(data.filename).toLowerCase();
      // Only keep alphanumeric extensions to be safe, or just trust our mimetype check
      const safeExt = ext.match(/^\.[a-z0-9]+$/) ? ext : '.bin';
      const uuid = crypto.randomUUID();
      const filename = `claim_${uuid}${safeExt}`;
      const filepath = path.join(evidenceDir, filename);

      // Save file
      await fs.writeFile(filepath, await data.toBuffer());

      return reply.code(201).send({ attachmentPath: filename });
    } catch (error: any) {
      // @ts-ignore
      if (error?.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.code(400).send({ error: 'File size limit exceeded' });
      }
      app.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}
