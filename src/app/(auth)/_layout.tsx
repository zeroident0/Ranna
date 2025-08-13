import { Slot } from "expo-router";
import { useAuth } from "../../providers/AuthProvider";
import { Redirect } from "expo-router";

export default function AuthLayout() {
    const { user } = useAuth();

    if (user) {
        return <Redirect href={'/(home)/(tabs)'} />;
    }

    return <Slot />;
}