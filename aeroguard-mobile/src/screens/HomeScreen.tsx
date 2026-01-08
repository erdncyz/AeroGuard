import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Platform,
    PermissionsAndroid,
    Modal,
    TextInput,
    FlatList,
    Alert,
    SafeAreaView,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import * as waqiService from '../services/waqiService';
import { StationData, SearchResult } from '../types/types';
import { getAqiMetadata } from '../constants/constants';

import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stationData, setStationData] = useState<StationData | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // Search State
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const requestPermissions = async () => {
        if (Platform.OS === 'ios') {
            const auth = await Geolocation.requestAuthorization('whenInUse');
            return auth === 'granted';
        }
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: "Konum İzni",
                    message: "Hava kalitesini göstermek için konumunuza ihtiyacımız var.",
                    buttonPositive: "Tamam"
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return false;
    };

    const loadLocationData = useCallback(async (useGeo = true) => {
        try {
            if (useGeo) {
                const hasPerm = await requestPermissions();
                if (hasPerm) {
                    Geolocation.getCurrentPosition(
                        async (position) => {
                            try {
                                const data = await waqiService.fetchByGeo(
                                    position.coords.latitude,
                                    position.coords.longitude
                                );
                                setStationData(data);
                            } catch (err) {
                                console.error('Geo fetch error:', err);
                                loadFallback();
                            } finally {
                                setLoading(false);
                                setRefreshing(false);
                            }
                        },
                        (error) => {
                            console.log('Location error:', error);
                            loadFallback();
                        },
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
                    );
                    return;
                }
            }
            loadFallback();
        } catch (err) {
            console.error('Error loading data:', err);
            loadFallback();
        }
    }, []);

    const loadFallback = async () => {
        try {
            const data = await waqiService.fetchByIP();
            setStationData(data);
        } catch (err) {
            console.error('Fallback error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadLocationData();
    }, [loadLocationData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadLocationData(true);
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length > 2) {
            setIsSearching(true);
            try {
                const results = await waqiService.searchStations(text);
                setSearchResults(results);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const selectStation = async (station: SearchResult) => {
        setSearchVisible(false);
        setLoading(true);
        setSearchQuery('');
        setSearchResults([]);

        try {
            if (station.station.geo) {
                const data = await waqiService.fetchByGeo(station.station.geo[0], station.station.geo[1]);
                setStationData(data);
            } else {
                Alert.alert('Bilgi', 'Bu istasyon için konum verisi alınamadı.');
                setLoading(false);
            }
        } catch (e) {
            console.error('Station select error', e);
            setLoading(false);
        }
    };

    if (loading && !stationData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Hava kalitesi kontrol ediliyor...</Text>
            </View>
        );
    }

    if (!stationData) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Veri yüklenemedi</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadLocationData(true)}>
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const aqiMeta = getAqiMetadata(stationData.aqi);

    return (
        <View style={styles.container}>
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerLeft}>
                            <View style={styles.iconContainer}>
                                <Text style={styles.iconText}>☁️</Text>
                            </View>
                            <View>
                                <Text style={styles.title}>AeroGuard</Text>
                                <Text style={styles.subtitle}>PRO</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={() => setSearchVisible(true)}
                        >
                            <Text style={styles.searchButtonText}>🔍 Ara</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* View Mode Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                        onPress={() => setViewMode('list')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>KART</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
                        onPress={() => setViewMode('map')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>HARİTA</Text>
                    </TouchableOpacity>
                </View>

                {viewMode === 'list' ? (
                    /* Main AQI Card */
                    <View style={styles.mainCard}>
                        <View style={[styles.aqiCircle, { backgroundColor: aqiMeta.color }]}>
                            <Text style={styles.aqiValue}>{stationData.aqi}</Text>
                            <Text style={styles.aqiLabel}>AQI</Text>
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: aqiMeta.color }]}>
                            <Text style={styles.statusText}>
                                {aqiMeta.key === 'good' && 'İYİ'}
                                {aqiMeta.key === 'moderate' && 'ORTA'}
                                {aqiMeta.key === 'unhealthySensitive' && 'HASSAS'}
                                {aqiMeta.key === 'unhealthy' && 'SAĞLIKSIZ'}
                                {aqiMeta.key === 'veryUnhealthy' && 'ÇOK SAĞLIKSIZ'}
                                {aqiMeta.key === 'hazardous' && 'TEHLİKELİ'}
                            </Text>
                        </View>

                        <View style={styles.locationContainer}>
                            <Text style={styles.locationIcon}>📍</Text>
                            <Text style={styles.locationText}>{stationData.city.name}</Text>
                        </View>

                        <View style={styles.infoGrid}>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoLabel}>SON GÜNCELLEME</Text>
                                <Text style={styles.infoValue}>
                                    {new Date(stationData.time.iso).toLocaleTimeString('tr-TR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoLabel}>BASKIN KİRLETİCİ</Text>
                                <Text style={styles.infoValue}>
                                    {stationData.dominentpol?.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    /* Map View */
                    <View style={styles.mapContainer}>
                        <MapView
                            provider={PROVIDER_DEFAULT}
                            style={styles.map}
                            initialRegion={{
                                latitude: stationData.city.geo[0],
                                longitude: stationData.city.geo[1],
                                latitudeDelta: 0.1,
                                longitudeDelta: 0.1,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: stationData.city.geo[0],
                                    longitude: stationData.city.geo[1],
                                }}
                                title={stationData.city.name}
                                description={`AQI: ${stationData.aqi}`}
                            >
                                <View style={[styles.mapMarker, { backgroundColor: aqiMeta.color }]}>
                                    <Text style={styles.mapMarkerText}>{stationData.aqi}</Text>
                                </View>
                            </Marker>
                        </MapView>
                    </View>
                )}

                {/* Pollutants */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>KİRLETİCİ DETAYLARI</Text>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>CANLI</Text>
                        </View>
                    </View>

                    <View style={styles.pollutantGrid}>
                        <PollutantCard.View
                            label="PM 2.5"
                            value={stationData.iaqi.pm25?.v}
                            unit="µg/m³"
                        />
                        <PollutantCard.View
                            label="PM 10"
                            value={stationData.iaqi.pm10?.v}
                            unit="µg/m³"
                        />
                        <PollutantCard.View
                            label="Ozon (O₃)"
                            value={stationData.iaqi.o3?.v}
                            unit="ppb"
                        />
                        <PollutantCard.View
                            label="Azot (NO₂)"
                            value={stationData.iaqi.no2?.v}
                            unit="ppb"
                        />
                    </View>
                </View>

                {/* Weather Conditions */}
                <View style={styles.weatherCard}>
                    <Text style={styles.weatherTitle}>HAVA KOŞULLARI</Text>
                    <View style={styles.weatherGrid}>
                        <WeatherItem
                            label="Sıcaklık"
                            value={`${stationData.iaqi.t?.v ?? '—'}°C`}
                            color="#38bdf8"
                        />
                        <WeatherItem
                            label="Nem"
                            value={`${stationData.iaqi.h?.v ?? '—'}%`}
                            color="#10b981"
                        />
                        <WeatherItem
                            label="Basınç"
                            value={`${stationData.iaqi.p?.v ?? '—'} hPa`}
                            color="#818cf8"
                        />
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Geliştirici: <Text style={styles.footerLink}>Erdinç Yılmaz</Text>
                    </Text>
                </View>
            </ScrollView>

            {/* Search Modal */}
            <Modal
                visible={searchVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSearchVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Şehir Ara</Text>
                        <TouchableOpacity onPress={() => setSearchVisible(false)}>
                            <Text style={styles.closeButton}>Kapat</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBoxContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Şehir adı girin (örn. Istanbul)..."
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoFocus
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    {isSearching ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color="#10b981" />
                    ) : (
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.uid.toString()}
                            contentContainerStyle={styles.resultList}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.resultItem}
                                    onPress={() => selectStation(item)}
                                >
                                    <Text style={styles.resultName}>{item.station.name}</Text>
                                    <View style={[styles.resultBadge, {
                                        backgroundColor: isNaN(parseInt(item.aqi)) ? '#94a3b8' :
                                            parseInt(item.aqi) > 150 ? '#ef4444' :
                                                parseInt(item.aqi) > 100 ? '#f97316' :
                                                    parseInt(item.aqi) > 50 ? '#eab308' : '#10b981'
                                    }]}>
                                        <Text style={styles.resultAqi}>{item.aqi}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                searchQuery.length > 2 ? (
                                    <Text style={styles.emptyText}>Sonuç bulunamadı.</Text>
                                ) : null
                            }
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </View>
    );
};

// Subcomponents
const PollutantCard = {
    View: ({ label, value, unit }: { label: string; value?: number; unit: string }) => (
        <View style={styles.pollutantCard}>
            <Text style={styles.pollutantLabel}>{label}</Text>
            <Text style={styles.pollutantValue}>{value ?? '—'}</Text>
            <Text style={styles.pollutantUnit}>{unit}</Text>
        </View>
    )
};

const WeatherItem = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <View style={styles.weatherItem}>
        <Text style={styles.weatherLabel}>{label}</Text>
        <Text style={[styles.weatherValue, { color }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '700',
        color: '#475569',
    },
    errorText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ef4444',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        backgroundColor: '#10b981',
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 2,
        marginTop: 2,
    },
    searchButton: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    searchButtonText: {
        fontWeight: '700',
        color: '#475569',
        fontSize: 14,
    },
    mainCard: {
        backgroundColor: '#fff',
        margin: 20,
        padding: 32,
        borderRadius: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    aqiCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    aqiValue: {
        fontSize: 56,
        fontWeight: '900',
        color: '#fff',
    },
    aqiLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
        opacity: 0.8,
        letterSpacing: 2,
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 16,
        marginBottom: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    locationIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    locationText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
        textAlign: 'center',
    },
    infoGrid: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    infoBox: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    infoLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#475569',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#1e293b',
        letterSpacing: 2,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
        marginRight: 6,
    },
    liveText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#10b981',
        letterSpacing: 1,
    },
    pollutantGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    pollutantCard: {
        backgroundColor: '#fff',
        width: (width - 52) / 2,
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    pollutantLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94a3b8',
        marginBottom: 8,
    },
    pollutantValue: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1e293b',
        marginBottom: 4,
    },
    pollutantUnit: {
        fontSize: 10,
        fontWeight: '700',
        color: '#cbd5e1',
    },
    weatherCard: {
        backgroundColor: '#1e293b',
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 24,
        marginBottom: 24,
    },
    weatherTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748b',
        letterSpacing: 2,
        marginBottom: 20,
    },
    weatherGrid: {
        gap: 16,
    },
    weatherItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    weatherLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
    },
    weatherValue: {
        fontSize: 16,
        fontWeight: '900',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        marginHorizontal: 20,
        marginVertical: 16,
        borderRadius: 16,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    toggleTextActive: {
        color: '#0f172a',
    },
    mapContainer: {
        height: 350,
        marginHorizontal: 20,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 24,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    mapMarkerText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 12,
    },
    footer: {
        padding: 32,
        alignItems: 'center',
        marginBottom: 40,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
    },
    footerLink: {
        color: '#10b981',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    closeButton: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 16,
    },
    searchBoxContainer: {
        padding: 20,
    },
    searchInput: {
        backgroundColor: '#f1f5f9',
        padding: 16,
        borderRadius: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    resultList: {
        paddingHorizontal: 20,
    },
    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
        marginRight: 12,
    },
    resultBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    resultAqi: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#94a3b8',
        fontWeight: '600',
    },
});

export default HomeScreen;
