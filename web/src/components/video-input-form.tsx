import { Button } from "./ui/button";
import { FileVideo,  Upload, CheckCircle} from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success' | 'error';

const statusMessages = {
  converting: 'Convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!',
  error: 'Ops! Erro :(',
}

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void;
}

export function VideoInputForm(props: VideoInputFormProps) {

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('waiting');
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  function handleFileSelected(event: ChangeEvent<HTMLInputElement> ) {
    const { files } = event.currentTarget;
    if (!files) return;

    const selectedFile = files[0];
    setVideoFile(selectedFile);

  }

  async function convertVideoToAudio(video: File) {
    console.log('Convert started');
    const ffmpeg = await getFFmpeg();
    await ffmpeg.writeFile("input.mp4", await fetchFile(video));

    // ffmpeg.on('log', log => {
    //   console.log(log);
    // })

    ffmpeg.on('progress', progress => {
      console.log('Convert progress: ' + Math.round(progress.progress * 100));
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3'
    ]);

    const data = await ffmpeg.readFile('output.mp3');
    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' });
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg',
    })
    console.log('Convert finished');
    return audioFile;
  }

  const previewURL = useMemo(() => {
    if (!videoFile) return null;

    return URL.createObjectURL(videoFile);

  },[videoFile])
  
  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = promptInputRef.current?.value;

    if (!videoFile) return
    // convert Video To Audio;

    setStatus('converting');
    const audioFile = await convertVideoToAudio(videoFile);

    console.log(audioFile, prompt);

    const videoData = new FormData();
    videoData.append('file', audioFile)

    setStatus('uploading');
    const { data } = await api.post('/videos', videoData);

    console.log(data);
    const videoId = data.video.id;
    setStatus('generating');
    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    });
    setStatus('success');
    console.log('transcription finished!');
    props.onVideoUploaded(videoId);

  }

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6" action="">
            <label
              className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
              htmlFor="video">
                {previewURL ? (
                    <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
                ) : (
                  <>
                    <FileVideo className="w-4 h-4"/>
                          Selecione um video
                  </>
               )}
            </label>
            <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
              <Textarea
                disabled={status !== 'waiting'}
                ref={promptInputRef}
                placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)"
                id="transcription_prompt"
                className="h-20 leading-relaxed resize-none" />
            </div>
            <Button 
              data-success = {status === 'success'}
              className="w-full data-[success=true]:bg-blue-300 "
              disabled={status !== 'waiting'}
              type="submit">
        
              {status === 'waiting' ?
                (<> Carregar Video <Upload className="w-4 h-4 ml-2" /></>
                 )
          : (<> {statusMessages[status]}<CheckCircle className="w-4 h-4 ml-1" /></>)
                  }
            </Button>
    </form>
  )
}