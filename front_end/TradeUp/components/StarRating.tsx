// components/StarRating.tsx
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface StarRatingProps {
    rating: number;               // current rating, e.g. 3.5
    onChange?: (rating: number) => void;  // optional callback
    size?: number;                // icon size
    color?: string;               // filled star color
}

export default function StarRating({
    rating,
    onChange,
    size = 24,
    color = '#FFD700',
}: StarRatingProps) {
    // build an array [1, 2, 3, 4, 5]
    return (
        <View style={styles.row}>
            {[1, 2, 3, 4, 5].map((i) => {
                let name: 'star' | 'star-half-full' | 'star-o' = 'star-o';
                if (i <= Math.floor(rating)) name = 'star';
                else if (i === Math.ceil(rating) && rating % 1 !== 0) name = 'star-half-full';

                return (
                    <Pressable
                        key={i}
                        onPress={() => onChange?.(i)}
                        style={styles.star}
                    >
                        <FontAwesome name={name} size={size} color={name === 'star-o' ? '#888' : color} />
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row' },
    star: { marginHorizontal: 4 },
});



