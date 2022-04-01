import { Program, Provider, Wallet, Idl } from '@project-serum/anchor'
import { Cyclos, Network, CreatePositionEvent, RequestClosureEvent } from '@cyclos-io/sdk'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'

import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
// CYCLOS IDL
import idl from './cyclos.json';

const SQS_QUEUE_URL = "https://sqs.ap-south-1.amazonaws.com/024701485805/Trial.fifo";

// Configs

async function run() {
    const connection = new Connection('https://ssc-dao.genesysgo.net')
    const k = new Keypair();

    // This seems to work.
    const provider = new Provider(connection, new Wallet(k), { commitment: "confirmed" });
    const program = new Program(idl as Idl, new PublicKey("CYS98pSt37MGGAD66StHE86gBVC8sYtgt96pPzvdKMnJ"), provider);

    // Doesn't seem to pick the right events in the addEventListener.
    // const cyclosClient = new Cyclos(connection, Network.MAIN, new Wallet(k))
    const client = new SQSClient({ region: "ap-south-1" });

    // Write to SQS
    program.addEventListener("RequestClosureEvent", async (event: RequestClosureEvent, slot) => {
        console.log('RequestClosureEvent event', event)
        let body = {
            positionMint: event.positionMint.toString(),
            positionDataAccount: event.positionDataAccount.toString(),
            positionOwnerAccount: event.positionOwnerAccount.toString(),
            positionTokenAccount: event.positionTokenAccount.toString(),
        }
        const params = {
            MessageAttributes: {
                Event: {
                    DataType: "String",
                    StringValue: "ClosePosition Event",
                }
            },
            MessageBody: JSON.stringify(body),
            MessageDeduplicationId: event.positionMint.toString(),  // Required for FIFO queues
            MessageGroupId: "ClosePositionEvent",  // Required for FIFO queues
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
        let body = {
            positionNftMint: event.positionNftMint.toString(),
            market: event.market.toString(),
            metaplexMetadataAccount: event.metaplexMetadataAccount.toString(),
            positionDataAccount: event.positionDataAccount.toString(),
            positionTokenAccount: event.positionTokenAccount.toString(),
            positionCreator: event.positionCreator.toString(),
            startPriceLot: event.startPriceLot.toNumber(),
            endPriceLot: event.endPriceLot.toNumber(),
            coinLots: event.coinLots.toNumber(),
            pcLots: event.pcLots.toNumber(),
        }
        const params = {
            MessageAttributes: {
                Event: {
                    DataType: "String",
                    StringValue: "CreatePosition Event",
                }
            },
            MessageBody: JSON.stringify(body),
            MessageDeduplicationId: event.positionNftMint.toString(),  // Required for FIFO queues
            MessageGroupId: "CreatePositionEvent",  // Required for FIFO queues
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
}

run();