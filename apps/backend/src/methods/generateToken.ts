import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
const secret = process.env.LIVEKIT_API_SECRET || "secret";

export const generateToken = async ({
    room,
    participantName
}: {
    room: string,
    participantName: string
}): Promise<string> => {

    const at = new AccessToken(apiKey, secret, {
        identity: participantName
    })

    at.addGrant({ roomJoin: true, room: room });

    const token = await at.toJwt();

    return token;
}