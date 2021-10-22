import { Program, Provider, Wallet, Idl } from '@project-serum/anchor'
import { Cyclos, MAIN_NET, Network, CreatePositionEvent, EventNames, InitPoolEvent, ClosePositionEvent } from '@cyclos-io/sdk'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'

import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
// CYCLOS IDL
import idl from './cyclos.json';


const SQS_QUEUE_URL = "https://sqs.ap-south-1.amazonaws.com/024701485805/Trial.fifo";

// Configs

(async () => {
    const connection = new Connection('https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/')
    const k =  new Keypair();

    // This seems to work.
    const provider = new Provider(connection, new Wallet(k), { commitment: "confirmed" });
    const program = new Program(idl as Idl, new PublicKey("CYS98pSt37MGGAD66StHE86gBVC8sYtgt96pPzvdKMnJ"), provider);
    
    // Doesn't seem to pick the right events in the addEventListener.
    const cyclosClient = new Cyclos(connection, Network.MAIN, new Wallet(k))
    const client = new SQSClient({ region: "ap-south-1" });


    // Write to SQS
    program.addEventListener("ClosePositionEvent", async (event: ClosePositionEvent, slot) => {
        console.log('ClosePositionEvent event', event)
        const params = {
            MessageAttributes: {
                Event: {
                    DataType: "String",
                    StringValue: "ClosePosition Event",
                }
            },
            MessageBody: JSON.stringify(event),
            MessageDeduplicationId: event.positionMint.toString(),  // Required for FIFO queues
            MessageGroupId: "Init Event",  // Required for FIFO queues
            QueueUrl: SQS_QUEUE_URL //SQS_QUEUE_URL; e.g., 'https://sqs.REGION.amazonaws.com/ACCOUNT-ID/QUEUE-NAME'
        };
        try {
            const data = await client.send(new SendMessageCommand(params));
            console.log("Success, message sent. MessageID:", data.MessageId);
            // return data; // For unit tests.
        } catch (err) {
            console.log("Error", err);
        }    })


    program.addEventListener("InitPoolEvent", async (event: InitPoolEvent, slot) => {
        console.log('Init pool event', event);
        const params = {
            MessageAttributes: {
                Event: {
                    DataType: "String",
                    StringValue: "Init Event",
                }
            },
            MessageBody: JSON.stringify(event),
            MessageDeduplicationId: event.poolCreator.toString(),  // Required for FIFO queues
            MessageGroupId: "Init Event",  // Required for FIFO queues
            QueueUrl: SQS_QUEUE_URL //SQS_QUEUE_URL; e.g., 'https://sqs.REGION.amazonaws.com/ACCOUNT-ID/QUEUE-NAME'
        };
        try {
            const data = await client.send(new SendMessageCommand(params));
            console.log("Success, message sent. MessageID:", data.MessageId);
            // return data; // For unit tests.
        } catch (err) {
            console.log("Error", err);
        }
    })

    program.addEventListener("CreatePositionEvent", async (event: CreatePositionEvent, slot) => {
        console.log('CreatePositionEvent event', event)
        const params = {
            MessageAttributes: {
                Event: {
                    DataType: "String",
                    StringValue: "CreatePosition Event",
                }
            },
            MessageBody: JSON.stringify(event),
            MessageDeduplicationId: event.positionNftMint.toString(),  // Required for FIFO queues
            MessageGroupId: "Init Event",  // Required for FIFO queues
            QueueUrl: SQS_QUEUE_URL //SQS_QUEUE_URL; e.g., 'https://sqs.REGION.amazonaws.com/ACCOUNT-ID/QUEUE-NAME'
        };
        try {
            const data = await client.send(new SendMessageCommand(params));
            console.log("Success, message sent. MessageID:", data.MessageId);
            // return data; // For unit tests.
        } catch (err) {
            console.log("Error", err);
        }
    })

    // Listen and after processing Delete from SQS
    // try {
    //     const data = await client.send(new ReceiveMessageCommand(params));
    //     console.log("Received Message ", data);
    //     if (data.Messages) {
    //         var deleteParams = {
    //             QueueUrl: SQS_QUEUE_URL,
    //             ReceiptHandle: data.Messages[0].ReceiptHandle,
    //         };
    //         try {
    //             const data = await client.send(new DeleteMessageCommand(deleteParams));
    //             console.log("Message deleted", data);
    //         } catch (err) {
    //             console.log("Error", err);
    //         }
    //     } else {
    //         console.log("No messages to delete");
    //     }
    //     // return data; // For unit tests.
    // } catch (err) {
    //     console.log("Receive Error", err);
    // }
})();