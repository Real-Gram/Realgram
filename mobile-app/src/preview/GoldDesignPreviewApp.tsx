import React, { useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GOLD_PREVIEW_HTML } from './generated/goldHtml';
import { allowGoldNavigation } from './goldPreviewPolicy';
import { IS_DESIGN_PREVIEW } from '../config/designPreview';

/** The explicitly requested gold design test; normal builds retain native UI. */
export function GoldDesignPreviewApp() {
  const ref=useRef<React.ElementRef<typeof WebView>>(null);
  const [failed,setFailed]=useState(false);
  if (!IS_DESIGN_PREVIEW) return null;
  return <ErrorBoundary><SafeAreaProvider><StatusBar barStyle="light-content" backgroundColor="#090A0E"/><SafeAreaView style={{flex:1,backgroundColor:'#090A0E'}} edges={['top','bottom']}>
    {failed?<View style={{flex:1,alignItems:'center',justifyContent:'center',padding:24}}><Text style={{color:'#F5F1E8',textAlign:'center',marginBottom:20}}>Could not open Gold After Dark. Try again.</Text><TouchableOpacity accessibilityRole="button" onPress={()=>setFailed(false)} style={{padding:16,backgroundColor:'#E7C778',borderRadius:20}}><Text style={{color:'#21170B'}}>Retry design preview</Text></TouchableOpacity></View>:
    <WebView ref={ref} source={{html:GOLD_PREVIEW_HTML,baseUrl:'https://realgram.no/'}}
      style={{flex:1,backgroundColor:'#090A0E'}} originWhitelist={['https://realgram.no','about:blank']}
      onShouldStartLoadWithRequest={request=>allowGoldNavigation(request.url)}
      javaScriptEnabled domStorageEnabled={false} allowFileAccess={false}
      allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
      mixedContentMode="never" thirdPartyCookiesEnabled={false} sharedCookiesEnabled={false}
      setSupportMultipleWindows={false} javaScriptCanOpenWindowsAutomatically={false}
      allowsInlineMediaPlayback={false} mediaPlaybackRequiresUserAction
      startInLoadingState renderLoading={()=><ActivityIndicator accessibilityLabel="Opening design preview" color="#E7C778" style={{position:'absolute',alignSelf:'center',top:'45%'}}/>}
      onError={()=>setFailed(true)} onContentProcessDidTerminate={()=>ref.current?.reload()}
    />}
  </SafeAreaView></SafeAreaProvider></ErrorBoundary>;
}
