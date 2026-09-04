import {
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getTemplates,
    getTemplatesByStage,
    getTemplateById,
    getTemplateByName,
    getTemplateByEmail,
    getDefaultTemplateByEmail,
    getTemplateStages,
} from "../api/template.api";
export const templateKeys = {
    all: ["templates"],

    lists: () => [
        "templates",
        "list",
    ],

    stage: (stage) => [
        "templates",
        "stage",
        stage,
    ],

    id: (id) => [
        "templates",
        "id",
        id,
    ],

    name: (name) => [
        "templates",
        "name",
        name,
    ],
    email: (email) => [
        "templates",
        "email",
        email,
    ],
    defaultTemplateByEmail: (email) => [
        "templates",
        "defaultTemplateByEmail",
        email,
    ],
    templateStages: () => [
        "templates",
        "stages",
    ],
};
export const useTemplates =
    () => {
        return useQuery({
            queryKey: templateKeys.lists(),
            queryFn: getTemplates,
            staleTime: 10 * 60 * 1000,
        });
    };
export const useDefaultTemplate =
    (email) => {
        return useQuery({
            queryKey: templateKeys.defaultTemplateByEmail(email),
            queryFn: () => getDefaultTemplateByEmail({ email }),
            enabled: !!email,
            staleTime: 10 * 60 * 1000,
        });
    };
export const useTemplateStages =
    () => {
        return useQuery({
            queryKey: templateKeys.templateStages(),
            queryFn: () => getTemplateStages(),
            staleTime: 10 * 60 * 1000,
        });
    };
export const useTemplatesByStage =
    (stage) => {
        return useQuery({
            queryKey: templateKeys.stage(stage),
            queryFn: () => getTemplatesByStage(stage),
            enabled: !!stage,
            staleTime: 10 * 60 * 1000,
        });

    };

export const useTemplate =
    (id) => {
        return useQuery({
            queryKey: templateKeys.id(id),
            queryFn: () => getTemplateById(id),
            enabled: !!id,
            staleTime: 10 * 60 * 1000,
        });
    };
export const useTemplateByName =
    (name) => {
        return useQuery({
            queryKey: templateKeys.name(name),
            queryFn: () => getTemplateByName(name),
            enabled: !!name,
            staleTime: 10 * 60 * 1000,
        });
    };
export const useTemplateByEmail =
    (email) => {
        return useQuery({
            queryKey: templateKeys.email(email),
            queryFn: () => getTemplateByEmail(email),
            enabled: !!email,
            staleTime: 10 * 60 * 1000,
        });
    };