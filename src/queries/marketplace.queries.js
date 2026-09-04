import {

    useMutation,
    useQuery,
} from "@tanstack/react-query";
import { addMarketPlace, getMarketPlaces, removeMarketPlace } from "../api/marketplace.api";
import toast from "react-hot-toast";
import { queryClient } from "../lib/queryClient";
import { contactKeys } from "./contact.queries";



export const marketPlaceKeys = {
    all: ["marketplace"],

    lists: [
        "marketplace",
        "list",
    ],

};


export const useMarketPlace = () =>
    useQuery({
        queryKey:
            marketPlaceKeys.lists,

        queryFn: () => getMarketPlaces(),

    });

export const useAddMarketPlace = () =>

    useMutation({
        mutationFn: addMarketPlace,

        onSuccess: (_, { email }) => {
            toast.success(`${email} is add to marketplace`)
            queryClient.invalidateQueries({ queryKey: marketPlaceKeys.all })
            queryClient.invalidateQueries({ queryKey: contactKeys.all })
        },
        onError: () => {
            toast.error("Failed to add in marketplace")
        }

    });
export const useDelMarketPlace = () =>

    useMutation({
        mutationFn: removeMarketPlace,

        onSuccess: (_, { email }) => {
            toast.success(`${email} is remove from marketplace`)
            queryClient.invalidateQueries({ queryKey: marketPlaceKeys.all })
            queryClient.invalidateQueries({ queryKey: contactKeys.all })
        },
        onError: () => {
            toast.error("Failed to remove from marketplace")
        }

    });



