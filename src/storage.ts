import { promises as fs } from "fs";

const FILE = "users.json";

export interface User {
    id: number;
    username: string;
}

export async function loadUsers(): Promise<User[]> {
    try {
        const data = await fs.readFile(FILE, "utf8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function saveUsers(users: User[]) {
    await fs.writeFile(FILE, JSON.stringify(users, null, 2));
}

export async function userExists(id: number): Promise<boolean> {
    return (await loadUsers()).some(user => user.id === id);
}

export async function addUser(id: number, username: string) {
    const users = await loadUsers();
    if (!users.some(user => user.id === id)) {
        users.push({ id, username });
        await saveUsers(users);
    }
}
