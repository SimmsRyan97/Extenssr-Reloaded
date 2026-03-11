export interface InferenceRect {
    x_min: number
    y_min: number
    x_max: number
    y_max: number
}

export enum WorkerMessageType {
    WORKER_READY,
    LOAD_MODEL,
    MODEL_LOADED,
    REQUEST_INFERENCE,
    RESPONSE_INFERENCE
}

export default interface WorkerMessage {
    type: WorkerMessageType
    inputImageData?: ImageData
    port?: MessagePort
    rects?: InferenceRect[]
    baseUrl?: string
}