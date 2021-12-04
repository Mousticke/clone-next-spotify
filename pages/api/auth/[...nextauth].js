import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import spotifyApi, { LOGIN_URL } from "../../../lib/spotify"

async function refreshAccessToken(token){
    try {
        
        spotifyApi.setAccessToken(token.accessToken)
        spotifyApi.setRefreshToken(token.refreshAccessToken)

        const {body: refreshToken} = await spotifyApi.refreshAccessToken()
        console.log("REFRESH TOKEN IS ", refreshAccessToken)

        return {
            ...token,
            accessToken: refreshToken.access_token,
            accessTokenExpires: Date.now() + refreshToken.expires_in * 1000,
            refreshToken: refreshToken.refresh_token ?? token.refreshToken
        }

    } catch (error) {
        console.error("Erreur ", error)
        return {
            ...token,
            error: 'RefreshAccessTokenError',
        }
    }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    SpotifyProvider({
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
      authorization: LOGIN_URL,
    }),
  ],
  secret:process.env.JWT_SECRET,
  pages: {
      signIn: '/login'
  },
  callbacks: {
      async jwt({token, account, user}){
          if(account && user){
              return {
                  ...token,
                  accessToken: account.access_token,
                  refreshToken: account.refresh_token,
                  username: account.providerAccountId,
                  accessTokenExpires: account.expires_at * 1000 //ms
              }
          }

          //refresh token
          if(Date.now() < token.accessTokenExpires){
              console.log("EXISTING ACCESS TOKEN IS VALID")
              return token
          }
        console.log("ACCESS TOKEN HAS EXPIRED")
        return await refreshAccessToken(token)
          
      },

      async session({session, token}){
          session.user.accessToken = token.accessToken;
          session.user.refreshToken = token.refreshToken;
          session.user.username = token.username

          return session
      }
  }
})