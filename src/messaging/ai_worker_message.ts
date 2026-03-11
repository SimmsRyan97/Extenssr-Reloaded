import { InferenceRect } from 'injected_scripts/worker_message'
import { Message } from './broker'

export type AiWorkerMessage = {
    loadModel: Message<string>
    hideCars: Message<ImageData, InferenceRect[]>
}