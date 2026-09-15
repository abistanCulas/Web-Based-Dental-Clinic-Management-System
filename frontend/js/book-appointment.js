const form=document.getElementById("appointmentForm");const message=document.getElementById("message");
form.addEventListener("submit",async e=>{e.preventDefault();
const appointment={patientId:Number(document.getElementById("patientId").value),dentistId:Number(document.getElementById("dentistId").value),appointmentDate:document.getElementById("appointmentDate").value,appointmentTime:document.getElementById("appointmentTime").value,reason:document.getElementById("reason").value};
try{const response=await fetch(APPOINTMENT_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(appointment)});
const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to book appointment.");
message.className="message success";message.innerText="Appointment booked successfully. Appointment ID: "+data.id;form.reset();}
catch(error){message.className="message error";message.innerText=error.message;}});
