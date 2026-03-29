import {LINK_ERRORS} from "@/constants/errors";

export function fromSearchError(error: string): string {
    switch (error) {
        case "account_conflict":
            return LINK_ERRORS.ACCOUNT_CONFLICT;
        case "no_youtube_channel":
            return LINK_ERRORS.NO_YOUTUBE_CHANNEL;
        default:
            return "Something went wrong. Please try again."
    }
}
