import React from "react"

export type ConnectionRowProps = {
    name: string
    description: string
    connected: boolean
    logo: React.ReactNode
    detail?: string
    comingSoon?: boolean
    connectButton?: React.ReactNode
    disconnectButton?: React.ReactNode
    children?: React.ReactNode
}
