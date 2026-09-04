import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import { getMarkTags } from "../api/marktag.api";



export const tagKeys = {
    all: ["marktags"],
};
export const useMarkTags = () =>
    useQuery({
        queryKey: tagKeys.all,
        queryFn: getMarkTags,
        staleTime: 1000 * 60 * 10, // 10 min
    });