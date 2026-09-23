import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function POST(req:Request){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Supabase server credentials are not configured.'},{status:503});
 const body=await req.json(); const {customer,occasion,notes,items}=body;
 const requestType = body.requestType === 'gift_finder' ? 'gift_finder' : 'gift_request';
 const hasItems=Array.isArray(items)&&items.length>0;
 if(!customer?.name||!customer?.phone||(!hasItems&&!notes))return NextResponse.json({error:'Name, phone and either gift items or a message are required.'},{status:400});
 const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
 let verifiedItems:{id:string;quantity:number;unit_price:number}[]=[];
 if(hasItems){
  const normalized=items.map((item:any)=>({id:String(item?.id||''),quantity:Number(item?.quantity||1)}));
  if(normalized.some((item:any)=>!item.id||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99))return NextResponse.json({error:'Invalid request items.'},{status:400});
  const {data:products,error:pe}=await supabase.from('products').select('id,price,is_published,stock').in('id',normalized.map((item:any)=>item.id));
  if(pe)return NextResponse.json({error:pe.message},{status:400});
  const byId=new Map((products||[]).map((product:any)=>[product.id,product]));
  verifiedItems=normalized.map((item:any)=>{const product:any=byId.get(item.id);return product&&product.is_published&&product.stock>=item.quantity?{id:item.id,quantity:item.quantity,unit_price:Number(product.price)}:null}).filter(Boolean) as {id:string;quantity:number;unit_price:number}[];
  if(verifiedItems.length!==normalized.length)return NextResponse.json({error:'One or more products are unavailable.'},{status:400});
 }
 const normalizedEmail=typeof customer.email==='string'?customer.email.trim().toLowerCase():null;
 const normalizedPhone=String(customer.phone).replace(/\D/g,'');
 if(!normalizedPhone)return NextResponse.json({error:'A valid customer phone is required.'},{status:400});
 const {data:customerId,error:ce}=await supabase.rpc('find_or_create_customer',{customer_name:String(customer.name).trim(),customer_email:normalizedEmail,customer_phone:normalizedPhone}); if(ce)return NextResponse.json({error:ce.message},{status:400});
 const c={id:customerId};
 const {data:r,error:re}=await supabase.from('requests').insert({customer_id:c.id,occasion:occasion||null,notes:notes||null,status:requestType === 'gift_finder' ? 'new' : 'pending',request_type:requestType,gift_for:body.giftFor||null,budget_min:body.budgetMin||null,budget_max:body.budgetMax||null,gift_category:body.category||null,preferences:body.preferences||null,recipient:body.recipient||null}).select('id').single(); if(re)return NextResponse.json({error:re.message},{status:400});
 if(hasItems){const {error:ie}=await supabase.from('request_items').insert(verifiedItems.map((item)=>({request_id:r.id,product_id:item.id,quantity:item.quantity,unit_price:item.unit_price}))); if(ie)return NextResponse.json({error:ie.message},{status:400});}
 return NextResponse.json({ok:true,id:r.id});
}
