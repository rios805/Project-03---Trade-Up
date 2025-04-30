// import React, { useState, useEffect } from 'react';
// import {
//     View,
//     Text,
//     Image,
//     StyleSheet,
//     Modal,
//     Pressable,
//     Alert,
//     FlatList,
//     TextInput,
//     Dimensions,
// } from 'react-native';
// import { Picker } from '@react-native-picker/picker';

// interface UserItemProps {
//     imageUrl: string;
//     value: string;
//     title: string;
// }

// export default function MarketItem({ imageUrl, value, title }: UserItemProps) {
//     const [infoModalVisible, setInfoModalVisible] = useState(false);
//     const [buyModalVisible, setBuyModalVisible] = useState(false);
//     const [bargainModalVisible, setBargainModalVisible] = useState(false);
//     const [tradeModalVisible, setTradeModalVisible] = useState(false);

//     const [inputPrice, setInputPrice] = useState(0);
//     const [multiplier, setMultiplier] = useState(1);
//     const [chatMessages, setChatMessages] = useState<string[]>([]);
//     const [message, setMessage] = useState('');
//     const [selectedTradeItem, setSelectedTradeItem] = useState('');

//     const [windowSize, setWindowSize] = useState(Dimensions.get('window'));

//     useEffect(() => {
//         const subscription = Dimensions.addEventListener('change', ({ window }) => {
//             setWindowSize(window);
//         });
//         return () => subscription?.remove();
//     }, []);

//     const tradeOptions = ['bike', 'chair', 'car', 'Mystery Box'];

//     const getClampedWidth = (percentage: number, min: number, max: number) => {
//         const calculated = windowSize.width * percentage;
//         return Math.min(Math.max(calculated, min), max);
//     };

//     const closeAll = () => {
//         setInfoModalVisible(false);
//         setBuyModalVisible(false);
//         setBargainModalVisible(false);
//         setTradeModalVisible(false);
//     };

//     const handleConfirmBuy = () => {
//         setBuyModalVisible(false);
//         Alert.alert('Purchase Confirmed', `You set a buy price of $${inputPrice.toFixed(2)}`);
//     };

//     const handleSendMessage = () => {
//         if (message.trim()) {
//             setChatMessages((msgs) => [...msgs, message.trim()]);
//             setMessage('');
//         }
//     };

//     const handleConfirmTrade = () => {
//         setTradeModalVisible(false);
//         Alert.alert('Trade Offer Sent', `You offered: ${selectedTradeItem}`);
//     };

//     const incrementPrice = () =>
//         setInputPrice((prev) => parseFloat((prev + multiplier).toFixed(2)));
//     const decrementPrice = () =>
//         setInputPrice((prev) => Math.max(0, parseFloat((prev - multiplier).toFixed(2))));
//     const incrementMultiplier = () => setMultiplier((prev) => prev + 1);
//     const decrementMultiplier = () => setMultiplier((prev) => Math.max(1, prev - 1));

//     return (
//         <View style={styles.card}>
//             <Image source={{ uri: imageUrl }} style={styles.image} />
//             <Text style={styles.title}>{title}</Text>
//             <Text style={styles.value}>${value}</Text>

//             {/* <Pressable style={styles.button} onPress={() => setInfoModalVisible(true)}>
//                 <Text style={styles.buttonText}>More Info</Text>
//             </Pressable> */}

//             <View style={{ height: 70 }} />

//             <View style={styles.infoRow}>
//                 <Pressable
//                     style={[styles.button, styles.buyButton]}
//                     onPress={() => {
//                         setInputPrice(parseFloat(value));
//                         setBuyModalVisible(true);
//                     }}
//                 >
//                     <Text style={styles.buttonText}>Buy</Text>
//                 </Pressable>

//                 <View>
//                     <Pressable
//                         style={[styles.button, styles.bargainButton]}
//                         onPress={() => setBargainModalVisible(true)}
//                     >
//                         <Text style={styles.buttonText}>Bargain</Text>
//                     </Pressable>
//                     <Pressable
//                         style={[styles.button, styles.tradeButton]}
//                         onPress={() => {
//                             setSelectedTradeItem(tradeOptions[0]);
//                             setTradeModalVisible(true);
//                         }}
//                     >
//                         <Text style={styles.buttonText}>Trade</Text>
//                     </Pressable>
//                 </View>
//             </View>

//             {/* Info Modal */}
//             <Modal animationType="slide" transparent visible={infoModalVisible} onRequestClose={closeAll}>
//                 <View style={styles.modalOverlay}>
//                     <View style={[styles.modalView, {
//                         width: getClampedWidth(0.4, 300, 500),
//                         height: windowSize.height * 0.5,
//                     }]}>
//                         <Pressable style={styles.topRightX} onPress={closeAll}>
//                             <Text style={styles.xText}>×</Text>
//                         </Pressable>
//                         <Text style={styles.modalTitle}>Item Details</Text>
//                         <Text style={styles.modalText}>Title: {title}</Text>
//                         <Text style={styles.modalText}>Price: ${value}</Text>
//                         <Pressable style={styles.confirmButton} onPress={closeAll}>
//                             <Text style={styles.buttonText}>Confirm</Text>
//                         </Pressable>
//                     </View>
//                 </View>
//             </Modal>

//             {/* Buy Modal */}
//             <Modal animationType="fade" transparent visible={buyModalVisible} onRequestClose={closeAll}>
//                 <View style={styles.modalOverlay}>
//                     <View style={[styles.modalView, {
//                         width: getClampedWidth(0.4, 300, 500),
//                         height: windowSize.height * 0.5,
//                     }]}>
//                         <Pressable style={styles.topRightX} onPress={closeAll}>
//                             <Text style={styles.xText}>×</Text>
//                         </Pressable>
//                         <Text style={styles.modalTitle}>Transaction</Text>

//                         <Text style={styles.label}>Price</Text>
//                         <View style={styles.stepperContainer}>
//                             <Pressable style={styles.stepperButton} onPress={decrementPrice}>
//                                 <Text style={styles.stepperText}>-</Text>
//                             </Pressable>
//                             <Text style={styles.priceText}>${inputPrice.toFixed(2)}</Text>
//                             <Pressable style={styles.stepperButton} onPress={incrementPrice}>
//                                 <Text style={styles.stepperText}>+</Text>
//                             </Pressable>
//                         </View>

//                         <Text style={styles.label}>Multiplier</Text>
//                         <View style={styles.stepperContainer}>
//                             <Pressable style={styles.stepperButton} onPress={decrementMultiplier}>
//                                 <Text style={styles.stepperText}>-</Text>
//                             </Pressable>
//                             <Text style={styles.priceText}>x{multiplier}</Text>
//                             <Pressable style={styles.stepperButton} onPress={incrementMultiplier}>
//                                 <Text style={styles.stepperText}>+</Text>
//                             </Pressable>
//                         </View>

//                         <Pressable style={styles.confirmButton} onPress={handleConfirmBuy}>
//                             <Text style={styles.buttonText}>Confirm</Text>
//                         </Pressable>
//                     </View>
//                 </View>
//             </Modal>

//             {/* Bargain Modal */}
//             <Modal animationType="fade" transparent visible={bargainModalVisible} onRequestClose={closeAll}>
//                 <View style={styles.modalOverlay}>
//                     <View style={[styles.modalView, {
//                         width: getClampedWidth(0.8, 320, 600),
//                         height: windowSize.height * 0.6,
//                     }]}>
//                         <Pressable style={styles.topRightX} onPress={closeAll}>
//                             <Text style={styles.xText}>×</Text>
//                         </Pressable>
//                         <Text style={styles.modalTitle}>Bargain with Seller</Text>

//                         <FlatList
//                             data={chatMessages}
//                             renderItem={({ item }) => <Text style={styles.chatMessage}>{item}</Text>}
//                             keyExtractor={(_, idx) => idx.toString()}
//                             style={styles.chatWindow}
//                         />

//                         <TextInput
//                             style={styles.chatInput}
//                             value={message}
//                             onChangeText={setMessage}
//                             placeholder="Type a message..."
//                             multiline
//                         />
//                         <Pressable style={styles.confirmButton} onPress={handleSendMessage}>
//                             <Text style={styles.buttonText}>Send</Text>
//                         </Pressable>
//                     </View>
//                 </View>
//             </Modal>

//             {/* Trade Modal */}
//             <Modal animationType="fade" transparent visible={tradeModalVisible} onRequestClose={closeAll}>
//                 <View style={styles.modalOverlay}>
//                     <View style={[styles.modalView, {
//                         width: getClampedWidth(0.6, 320, 600),
//                         height: windowSize.height * 0.4,
//                     }]}>
//                         <Pressable style={styles.topRightX} onPress={closeAll}>
//                             <Text style={styles.xText}>×</Text>
//                         </Pressable>
//                         <Text style={styles.modalTitle}>Trade</Text>
//                         <Text style={styles.label}>Offer an item to trade:</Text>
//                         <Picker
//                             selectedValue={selectedTradeItem}
//                             onValueChange={(itemValue) => setSelectedTradeItem(itemValue)}
//                             style={{ width: '100%' }}
//                         >
//                             {tradeOptions.map((item) => (
//                                 <Picker.Item key={item} label={item} value={item} />
//                             ))}
//                         </Picker>
//                         <Pressable style={styles.confirmButton} onPress={handleConfirmTrade}>
//                             <Text style={styles.buttonText}>Send Trade</Text>
//                         </Pressable>
//                     </View>
//                 </View>
//             </Modal>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     card: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         padding: 16,
//         shadowColor: '#000',
//         shadowOpacity: 0.1,
//         shadowRadius: 5,
//         shadowOffset: { width: 0, height: 3 },
//         marginBottom: 20,
//         alignItems: 'center',
//     },
//     image: { width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
//     title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 6 },
//     value: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },

//     infoRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',

//         // limit how wide the row can grow
//         width: '100%',
//         maxWidth: 600,          // <-- caps the row at 600px
//         alignSelf: 'center',    // <-- centers that 600px block in the screen

//         // optional padding inside that block
//         paddingHorizontal: 10,

//         marginBottom: 20,
//         // borderWidth: 1,
//         // borderStyle: 'solid',
//         // borderColor: 'black',
//     },

//     button: {
//         marginTop: 10,
//         backgroundColor: '#4CAF50',
//         paddingVertical: 8,
//         paddingHorizontal: 16,
//         borderRadius: 5,
//     },
//     buyButton: {
//         backgroundColor: '#28ff00',
//         width: 80,
//         height: 80,
//         borderRadius: 40, // half of 80
//         justifyContent: 'center',
//         alignItems: 'center',
//     },

//     bargainButton: {
//         backgroundColor: '#00d9ff',
//     },
//     tradeButton: { backgroundColor: '#ff0013' },
//     buttonText: { color: '#fff', fontWeight: 'bold' },

//     modalOverlay: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: 'rgba(0,0,0,0.5)',
//     },
//     modalView: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         padding: 20,
//         alignItems: 'center',
//         position: 'relative',
//         elevation: 5,
//     },

//     topRightX: {
//         position: 'absolute',
//         top: 10,
//         right: 10,
//     },
//     xText: {
//         fontSize: 20,
//         color: '#000',
//     },

//     modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
//     modalText: { fontSize: 16, marginBottom: 10 },
//     label: { marginTop: 10, fontWeight: 'bold', fontSize: 16 },

//     stepperContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginVertical: 8,
//     },
//     stepperButton: {
//         backgroundColor: '#ddd',
//         padding: 10,
//         borderRadius: 5,
//         marginHorizontal: 10,
//     },
//     stepperText: { fontSize: 18, fontWeight: 'bold' },
//     priceText: { fontSize: 20, fontWeight: 'bold' },

//     confirmButton: {
//         position: 'absolute',
//         bottom: 20,
//         right: 20,
//         backgroundColor: '#4CAF50',
//         paddingVertical: 10,
//         paddingHorizontal: 20,
//         borderRadius: 5,
//     },

//     chatWindow: { width: '50%', marginVertical: 10 },
//     chatMessage: { fontSize: 14, paddingVertical: 5 },
//     chatInput: {
//         borderWidth: 1,
//         borderColor: '#ddd',
//         borderRadius: 5,
//         padding: 10,
//         width: '50%',
//         marginBottom: 10,
//     },
// });




import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Modal,
    Pressable,
    Alert,
    FlatList,
    TextInput,
    Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface MarketItemProps {
    imageUrl: string;
    price: number;
    title: string;
    description: string;
}

export default function MarketItem({ imageUrl, price, title, description }: MarketItemProps) {
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [buyModalVisible, setBuyModalVisible] = useState(false);
    const [bargainModalVisible, setBargainModalVisible] = useState(false);
    const [tradeModalVisible, setTradeModalVisible] = useState(false);

    const [inputPrice, setInputPrice] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [chatMessages, setChatMessages] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [selectedTradeItem, setSelectedTradeItem] = useState('');

    const [windowSize, setWindowSize] = useState(Dimensions.get('window'));

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setWindowSize(window);
        });
        return () => subscription?.remove();
    }, []);

    const tradeOptions = ['bike', 'chair', 'car', 'Mystery Box'];

    const getClampedWidth = (percentage: number, min: number, max: number) => {
        const calculated = windowSize.width * percentage;
        return Math.min(Math.max(calculated, min), max);
    };

    const closeAll = () => {
        setInfoModalVisible(false);
        setBuyModalVisible(false);
        setBargainModalVisible(false);
        setTradeModalVisible(false);
    };

    const handleConfirmBuy = () => {
        setBuyModalVisible(false);
        Alert.alert('Purchase Confirmed', `You set a buy price of $${inputPrice.toFixed(2)}`);
    };

    const handleSendMessage = () => {
        if (message.trim()) {
            setChatMessages((msgs) => [...msgs, message.trim()]);
            setMessage('');
        }
    };

    const handleConfirmTrade = () => {
        setTradeModalVisible(false);
        Alert.alert('Trade Offer Sent', `You offered: ${selectedTradeItem}`);
    };

    const incrementPrice = () =>
        setInputPrice((prev) => parseFloat((prev + multiplier).toFixed(2)));
    const decrementPrice = () =>
        setInputPrice((prev) => Math.max(0, parseFloat((prev - multiplier).toFixed(2))));
    const incrementMultiplier = () => setMultiplier((prev) => prev + 1);
    const decrementMultiplier = () => setMultiplier((prev) => Math.max(1, prev - 1));

    return (
        <View style={styles.card}>
            <Image source={{ uri: imageUrl }} style={styles.image} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.value}>${price}</Text>
            <Text style={styles.description}>{description}</Text>

            <View style={{ height: 70 }} />

            <View style={styles.infoRow}>
                <Pressable
                    style={[styles.button, styles.buyButton]}
                    onPress={() => {
                        setInputPrice(price);
                        setBuyModalVisible(true);
                    }}
                >
                    <Text style={styles.buttonText}>Buy</Text>
                </Pressable>

                <View>
                    <Pressable
                        style={[styles.button, styles.bargainButton]}
                        onPress={() => setBargainModalVisible(true)}
                    >
                        <Text style={styles.buttonText}>Bargain</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.button, styles.tradeButton]}
                        onPress={() => {
                            setSelectedTradeItem(tradeOptions[0]);
                            setTradeModalVisible(true);
                        }}
                    >
                        <Text style={styles.buttonText}>Trade</Text>
                    </Pressable>
                </View>
            </View>

            {/* Modals and other components remain the same as before */}
            {/* ... */}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
        marginBottom: 20,
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    description: {
        fontSize: 14,
        color: '#777',
        marginBottom: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    button: {
        marginTop: 10,
        backgroundColor: '#4CAF50',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 5,
    },
    buyButton: {
        backgroundColor: '#28ff00',
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bargainButton: {
        backgroundColor: '#00d9ff',
    },
    tradeButton: {
        backgroundColor: '#ff0013',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalDescription: {
        fontSize: 16,
        color: '#555',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    modalButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 5,
        width: '45%',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 20,
        paddingHorizontal: 10,
        width: '100%',
    },
    chatContainer: {
        width: '100%',
        maxHeight: 300,
        marginTop: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
    },
    chatMessage: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
    },
    chatInput: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 20,
        paddingHorizontal: 10,
        width: '100%',
    },
    tradePicker: {
        width: '100%',
        marginBottom: 20,
    },
    tradeOption: {
        padding: 10,
        backgroundColor: '#f4f4f4',
        borderRadius: 5,
        marginBottom: 5,
    },
    tradeOptionText: {
        fontSize: 16,
        color: '#333',
    },
    tradeConfirmationButton: {
        backgroundColor: '#ff5733',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        alignSelf: 'center',
        marginTop: 20,
    },
    tradeConfirmationButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    priceAdjustmentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceAdjustmentButton: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
    },
    priceAdjustmentText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
