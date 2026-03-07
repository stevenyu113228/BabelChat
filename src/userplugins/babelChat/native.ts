import { IpcMainInvokeEvent } from "electron";

export async function translateRequest(
    _: IpcMainInvokeEvent,
    endpoint: string,
    apiKey: string,
    body: string
) {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const res = await fetch(endpoint, {
            method: "POST",
            headers,
            body,
        });

        const data = await res.text();
        return { status: res.status, data };
    } catch (e) {
        return { status: -1, data: String(e) };
    }
}
