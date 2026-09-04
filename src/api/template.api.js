import { apiRequest, fetchGpc } from "../services/api";
import { getCRM, getCurrentUser } from "../services/utils";
import { CREATE_DEAL_API_KEY } from "../store/constants";

/**
 * Get All Templates
 */
export const getTemplates =
    async () => {
        const data = await apiRequest({
            endpoint: `${getCRM()}?entryPoint=get_post_all&action_type=get_data`,
            method: "POST",
            headers: {
                "x-api-key": CREATE_DEAL_API_KEY,
                "Content-Type": "application/json",
            },
            body: {
                module: "EmailTemplates",
                where: { status: "Active" },
            },
        });
        return data;
    };
export const getDefaultTemplateByEmail = ({ email }) => apiRequest({ endpoint: `${getCRM()}?entryPoint=updateOffer&email=${email}` })
export const getTemplateStages = () => fetchGpc({ params: { type: "templates" }, body: { stages: 2 }, method: "POST" })

/**
 * Get Templates By Stage
 */
export const getTemplatesByStage =
    async (stage) => fetchGpc({ method: "POST", params: { type: 'templates' }, body: { assigned_user_id: getCurrentUser()?.id, stage_type: stage } })

/**
 * Get Template By Id
 */
export const getTemplateById =
    async (id) => {
        const data = await apiRequest({
            endpoint: `${getCRM()}?entryPoint=get_post_all&action_type=get_data`,
            method: "POST",
            headers: {
                "x-api-key": CREATE_DEAL_API_KEY,
                "Content-Type": "application/json",
            },
            body: {
                module: "EmailTemplates",
                where: { id: id },
            },
        });
        return data;
    };

/**
 * Get Template By Name
 */
export const getTemplateByName =
    async (name) => {
        const data = await apiRequest({
            endpoint: `${getCRM()}?entryPoint=get_post_all&action_type=get_data`,
            method: "POST",
            headers: {
                "x-api-key": CREATE_DEAL_API_KEY,
                "Content-Type": "application/json",
            },
            body: {
                module: "EmailTemplates",
                where: { name: name },
            },
        });
        return data;
    };
export const getTemplateByEmail =
    async (email) => {
        const data = await apiRequest({
            endpoint: `${getCRM()}/index.php?entryPoint=get_buttons&type=regular&email=${email}`,
        });
        return data;
    };