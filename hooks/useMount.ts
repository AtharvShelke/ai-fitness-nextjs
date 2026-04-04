import { useEffect, useState } from "react";

export function useMount() {
    const [m, setM] = useState(false);
    useEffect(() => setM(true), []);
    return m;
}