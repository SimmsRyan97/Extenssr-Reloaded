import 'reflect-metadata'
import { InferenceSession, Tensor, env } from 'onnxruntime-web'
import { InferenceRect } from './worker_message'
import {WebWorkerToContentBroker} from '../messaging/content_to_web_worker_broker'
import { AiWorkerMessage } from 'messaging/ai_worker_message'

const class_names_ssd = ['__background__', 'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush']

enum State {
    Waiting,
    Loading,
    Idle,
    Inferring,
}

function preprocess_rgb(imageData: ImageData): Tensor {
    const { data, width, height } = imageData
    const uint8data = new Uint8Array(3 * width * height)
    let idx = 0
    for (let i = 0; i < data.length; i += 4) {
        uint8data[idx++] = (data[i + 0])
        uint8data[idx++] = (data[i + 1])
        uint8data[idx++] = (data[i + 2])
        // skip data[i + 3] to filter out the alpha channel
    }
    const inputTensor = new Tensor('uint8', uint8data, [1, height, width, 3])
    return inputTensor
}

let state = State.Waiting
let sessionSSD: InferenceSession = null

const broker = new WebWorkerToContentBroker<AiWorkerMessage>()

broker.createListener('loadModel', '', async (baseUrl) => {
    if (state !== State.Waiting) {
        return
    }
    env.wasm.wasmPaths = baseUrl + 'wasm/'
    state = State.Waiting
    sessionSSD = await InferenceSession.create(baseUrl +'models/ssd_mobilenet_v1_12-int8.onnx', {executionProviders: ['wasm']})
    state = State.Idle
})

broker.createListener('hideCars', '', async (imageData) => {
    state = State.Inferring
    const {width, height} = imageData
    const input_tensor = preprocess_rgb(imageData)
    const outputs = await sessionSSD.run({inputs: input_tensor})
    const num_detections = outputs['num_detections'].data[0]
    const detection_classes = outputs['detection_classes'].data
    const boxes = outputs['detection_boxes']
    const rects: InferenceRect[] = []
    for (let box = 0; box < num_detections; ++box) {
        const class_index = detection_classes[box] as number
        const class_name = class_names_ssd[class_index]
        if (!['bus', 'car', 'truck', 'motorcycle'].includes(class_name)) {
            continue
        }
        const [y_min, x_min, y_max, x_max] = [boxes.data[box * 4] as number * height, boxes.data[box * 4 + 1] as number * width, boxes.data[box * 4 + 2] as number * height, boxes.data[box * 4 + 3] as number * width]
        rects.push({x_min, y_min, x_max, y_max})
    }
    state = State.Idle
    return rects || []
})
