// SlimSAM: Apache-2.0. All inference stays in this worker; no image is sent over the network.
let model,processor,RawImage,embeddings,imageKey;
self.onmessage=async({data})=>{const {id,key,width,height,pixels,points,labels}=data;try{
 if(!model){self.postMessage({id,type:'progress',message:'正在下载本地选物模型及运行库，首次可能需要较长时间…'});
 const lib=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');RawImage=lib.RawImage;lib.env.allowLocalModels=false;lib.env.backends.onnx.wasm.numThreads=1;
 const progress_callback=p=>{if(p.status==='progress')self.postMessage({id,type:'progress',message:'正在下载模型：'+Math.round(p.progress||0)+'%'});};
 [model,processor]=await Promise.all([lib.SamModel.from_pretrained('Xenova/slimsam-77-uniform',{dtype:'q8',device:'wasm',progress_callback}),lib.AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform')]);}
 self.postMessage({id,type:'progress',message:'正在本机识别物体边缘…'});
 const image=new RawImage(new Uint8ClampedArray(pixels),width,height,4);
 const inputs=await processor(image,{input_points:[points],input_labels:[labels]});
 if(imageKey!==key){embeddings=await model.get_image_embeddings(inputs);imageKey=key;}
 const result=await model({...inputs,...embeddings});
 const masks=await processor.post_process_masks(result.pred_masks,inputs.original_sizes,inputs.reshaped_input_sizes);
 const scores=result.iou_scores.data;let best=0;for(let i=1;i<scores.length;i++)if(scores[i]>scores[best])best=i;
 const tensor=masks[0],h=tensor.dims.at(-2),w=tensor.dims.at(-1),size=w*h;
 const chosen=Uint8Array.from(tensor.data.subarray(best*size,(best+1)*size),v=>v?255:0);
 self.postMessage({id,type:'result',mask:chosen,width:w,height:h},[chosen.buffer]);
 }catch(error){self.postMessage({id,type:'error',message:'选物未完成，请检查网络或改用补涂。模型下载可能受网络限制。'});}};
