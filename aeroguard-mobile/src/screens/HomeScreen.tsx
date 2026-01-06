import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import * as waqiService from '../services/waqiService';
import { StationData } from '../types/types';
import { getAqiMetadata } from '../constants/constants';

import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stationData, setStationData] = useState<StationData | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    const loadLocationData = async () => {
        try {
            const data = await waqiService.fetchByIP();
            setStationData(data);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadLocationData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadLocationData();
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
                <TouchableOpacity style={styles.retryButton} onPress={loadLocationData}>
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const aqiMeta = getAqiMetadata(stationData.aqi);

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.iconText}>☁️</Text>
                    </View>
                    <View>
                        <Text style={styles.title}>AeroGuard Pro</Text>
                        <Text style={styles.subtitle}>HAVA KALİTESİ İZLEME</Text>
                    </View>
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
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
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
                    <PollutantCard
                        label="PM 2.5"
                        value={stationData.iaqi.pm25?.v}
                        unit="µg/m³"
                    />
                    <PollutantCard
                        label="PM 10"
                        value={stationData.iaqi.pm10?.v}
                        unit="µg/m³"
                    />
                    <PollutantCard
                        label="Ozon (O₃)"
                        value={stationData.iaqi.o3?.v}
                        unit="ppb"
                    />
                    <PollutantCard
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
    );
};

const PollutantCard = ({
    label,
    value,
    unit,
}: {
    label: string;
    value?: number;
    unit: string;
}) => (
    <View style={styles.pollutantCard}>
        <Text style={styles.pollutantLabel}>{label}</Text>
        <Text style={styles.pollutantValue}>{value ?? '—'}</Text>
        <Text style={styles.pollutantUnit}>{unit}</Text>
    </View>
);

const WeatherItem = ({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color: string;
}) => (
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
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerContent: {
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
        fontSize: 24,
        fontWeight: '900',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 2,
        marginTop: 2,
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
    },
    footerText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
    },
    footerLink: {
        color: '#10b981',
    },
});

export default HomeScreen;
