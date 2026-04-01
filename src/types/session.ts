import {Session} from "next-auth";
import {NextRequest, NextResponse} from "next/server";
import {User} from "@/types/entities";

export type SessionWithTwitchId = Session & { twitchId: string }
export type SessionResult<T extends Session = Session> = { session: T } | NextResponse
export type TwitchSessionResult = SessionResult<SessionWithTwitchId>

export type WidgetAuthSuccess = { user: User }
export type WidgetAuthResult = WidgetAuthSuccess | NextResponse

export type ApiAuthSuccess = { user: User }
export type ApiAuthResult = ApiAuthSuccess | NextResponse
